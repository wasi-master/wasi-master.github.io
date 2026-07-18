import argparse
import json
import os
import re
import math
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup, NavigableString
from requests.adapters import HTTPAdapter
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)
from urllib3.util.retry import Retry

GITHUB_API_BASE = "https://api.github.com/repos"
PEPY_API_BASE = "https://api.pepy.tech/api/v2/projects"
VSCODE_MARKETPLACE_API = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery"
REQUEST_TIMEOUT_SECONDS = 12
BLOCKED_GITHUB_SEGMENTS = {
    "actions",
    "blob",
    "commit",
    "commits",
    "compare",
    "discussions",
    "issues",
    "pull",
    "pulls",
    "raw",
    "releases",
    "search",
    "tree",
    "wiki",
}


def build_session(pool_size: int = 10) -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.4,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods={"GET"},
    )
    adapter = HTTPAdapter(
        max_retries=retries,
        pool_connections=pool_size,
        pool_maxsize=pool_size,
    )
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": "wasi-master-portfolio-stats-updater"})

    github_api_key = os.environ.get("GITHUB_API_KEY", "").strip()
    github_token = os.environ.get("GITHUB_TOKEN", "").strip()
    github_secret = github_api_key or github_token
    if github_secret:
        session.headers.update({"Authorization": f"Bearer {github_secret}"})

    return session


def extract_github_repo(url: str) -> str | None:
    parsed = urlparse(url)
    if "github.com" not in parsed.netloc.lower():
        return None

    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 2:
        return None

    owner, repo = parts[0], parts[1].removesuffix(".git")
    if not owner or not repo:
        return None

    if repo.lower() in BLOCKED_GITHUB_SEGMENTS:
        return None

    if len(parts) >= 3 and parts[2].lower() in BLOCKED_GITHUB_SEGMENTS:
        return None

    return f"{owner}/{repo}"


def extract_pypi_package(url: str) -> str | None:
    parsed = urlparse(url)
    if "pypi.org" not in parsed.netloc.lower():
        return None

    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) >= 2 and parts[0].lower() == "project":
        return parts[1]
    return None


def extract_vscode_extension(url: str) -> str | None:
    parsed = urlparse(url)
    if "marketplace.visualstudio.com" not in parsed.netloc.lower():
        return None

    query = parse_qs(parsed.query)
    item_names = query.get("itemName")
    if item_names:
        return item_names[0]
    return None


def fetch_github_stars_forks(session: requests.Session, repo: str) -> tuple[tuple[int, int] | None, str | None]:
    try:
        response = session.get(
            f"{GITHUB_API_BASE}/{repo}",
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        if response.status_code != 200:
            if response.status_code == 403 and "X-RateLimit-Remaining" in response.headers:
                return None, "GitHub API rate limit reached"
            return None, f"GitHub API HTTP {response.status_code}"
        data = response.json()
        return (int(data.get("stargazers_count", 0)), int(data.get("forks_count", 0))), None
    except requests.RequestException:
        return None, "GitHub request failed"
    except (TypeError, ValueError):
        return None, "GitHub response parse failed"


def fetch_pepy_downloads(session: requests.Session, package: str) -> tuple[int | None, str | None]:
    headers = {}
    pepy_api_key = os.environ.get("PEPY_API_KEY", "").strip()
    if pepy_api_key:
        headers["X-Api-Key"] = pepy_api_key

    try:
        response = session.get(
            f"{PEPY_API_BASE}/{package}",
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        if response.status_code != 200:
            if response.status_code == 403:
                return None, "Pepy API unauthorized or rate-limited"
            if response.status_code == 404:
                return None, "Pepy package not found"
            return None, f"Pepy API HTTP {response.status_code}"
        data = response.json()
        return int(data.get("total_downloads", 0)), None
    except requests.RequestException:
        return None, "Pepy request failed"
    except (TypeError, ValueError):
        return None, "Pepy response parse failed"


def fetch_vscode_downloads(session: requests.Session, extension_id: str) -> tuple[int | None, str | None]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json;api-version=3.0-preview.1"
    }
    payload = {
        "filters": [
            {
                "criteria": [
                    {
                        "filterType": 7,
                        "value": extension_id
                    }
                ]
            }
        ],
        "flags": 914
    }
    try:
        response = session.post(
            VSCODE_MARKETPLACE_API,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        if response.status_code != 200:
            return None, f"VS Code Marketplace API HTTP {response.status_code}"
        
        data = response.json()
        results = data.get("results", [])
        if not results:
            return None, "VS Code Marketplace empty results"
        
        extensions = results[0].get("extensions", [])
        if not extensions:
            return None, "VS Code Marketplace extension not found"
        
        extension = extensions[0]
        statistics = extension.get("statistics", [])
        
        installs = 0
        update_count = 0
        for stat in statistics:
            name = stat.get("statisticName", "").lower()
            val = stat.get("value", 0)
            if name == "install":
                installs = val
            elif name == "updatecount":
                update_count = val
                
        return int(installs + update_count), None
    except requests.RequestException:
        return None, "VS Code Marketplace request failed"
    except (TypeError, ValueError, IndexError, KeyError):
        return None, "VS Code Marketplace response parse failed"


def extract_count(text: str) -> int | None:
    values = extract_all_counts(text)
    return values[0] if values else None


def _parse_count_token(token: str) -> int | None:
    cleaned = token.strip().replace(",", "")
    compact_match = re.fullmatch(r"(\d+(?:\.\d+)?)\s*([kKmM])\+?", cleaned)
    if compact_match:
        number = float(compact_match.group(1))
        suffix = compact_match.group(2).upper()
        multiplier = 1_000_000 if suffix == "M" else 1_000
        return int(number * multiplier)

    plain_match = re.fullmatch(r"\d+", cleaned)
    if plain_match:
        return int(cleaned)

    return None


def extract_all_counts(text: str) -> list[int]:
    if not text:
        return []

    pattern = r"\d+(?:\.\d+)?\s*[kKmM]\+?|\d[\d,]*"
    tokens = re.findall(pattern, text)
    values: list[int] = []
    for token in tokens:
        parsed = _parse_count_token(token)
        if parsed is not None:
            values.append(parsed)
    return values

def format_count(value: int) -> str:
    if value <= 10_000:
        return str(value)

    if value >= 1_000_000:
        scaled = math.floor(value / 1_000_000)
        return f"{scaled}M+"

    scaled = value / 1_000

    if scaled < 100:
        scaled = math.floor(scaled * 10) / 10
        if scaled.is_integer():
            return f"{int(scaled)}K+"
        return f"{scaled:.1f}K+"
    else:
        return f"{math.floor(scaled)}K+"

def parse_github_tooltip(text: str) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    numbers = extract_all_counts(text)
    if len(numbers) < 2:
        return None, None
    return numbers[0], numbers[1]


def parse_download_tooltip(text: str) -> int | None:
    if not text:
        return None
    return extract_count(text)


def pick_highest(*values: int | None) -> int | None:
    filtered = [value for value in values if value is not None]
    return max(filtered) if filtered else None


def get_card_stat_values(card) -> dict[str, int | None]:
    values: dict[str, int | None] = {"stars": None, "forks": None, "downloads": None}
    for stat in card.select(".stats .stat"):
        icon = stat.find("i", attrs={"data-feather": True})
        icon_name = icon.get("data-feather", "").strip().lower() if icon else ""
        has_fork_icon = bool(stat.select_one("img[src*='fork']"))
        value = extract_count(stat.get_text(" ", strip=True))

        if value is None:
            continue

        if icon_name == "star":
            values["stars"] = value
        elif has_fork_icon:
            values["forks"] = value
        elif icon_name == "download":
            values["downloads"] = value

    return values


def _set_stat_value(stat_element, value: int, unit: str) -> bool:
    current_text = stat_element.get_text(" ", strip=True)
    formatted_value = format_count(value)
    target_text = f"{formatted_value} {unit}"
    if current_text.lower() == target_text.lower():
        return False

    icon = stat_element.find(["i", "img"])
    if icon is None:
        return False

    new_text = f" {target_text}"
    changed = False

    trailing_nodes = list(icon.next_siblings)
    if trailing_nodes:
        for node in trailing_nodes:
            node.extract()
        changed = True

    icon.insert_after(NavigableString(new_text))
    return changed or (stat_element.get_text(" ", strip=True) != target_text)


def update_card_stats(card, stars: int | None = None, forks: int | None = None, downloads: int | None = None) -> int:
    updates = 0
    for stat in card.select(".stats .stat"):
        icon = stat.find("i", attrs={"data-feather": True})
        icon_name = icon.get("data-feather", "").strip().lower() if icon else ""
        has_fork_icon = bool(stat.select_one("img[src*='fork']"))

        if stars is not None and icon_name == "star":
            if _set_stat_value(stat, stars, "Stars"):
                updates += 1
        elif forks is not None and has_fork_icon:
            if _set_stat_value(stat, forks, "Forks"):
                updates += 1
        elif downloads is not None and icon_name == "download":
            if _set_stat_value(stat, downloads, "Downloads"):
                updates += 1
    return updates


def update_index(index_path: Path, no_concurrency: bool = False) -> dict[str, int | bool]:
    html_before = index_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_before, "html.parser")
    cards = soup.select(".card")

    github_cache: dict[str, tuple[tuple[int, int] | None, str | None]] = {}
    pypi_cache: dict[str, tuple[int | None, str | None]] = {}
    vscode_cache: dict[str, tuple[int | None, str | None]] = {}

    updated = 0
    text_updated = 0
    untouched = 0
    failed = 0
    fail_messages: list[str] = []

    # Gather targets
    github_targets = set()
    pypi_targets = set()
    vscode_targets = set()

    for card in cards:
        for button in card.select("a.button"):
            href = (button.get("href") or "").strip()
            if not href:
                continue
            repo = extract_github_repo(href)
            if repo:
                github_targets.add(repo)
                continue
            package = extract_pypi_package(href)
            if package:
                pypi_targets.add(package)
                continue
            extension = extract_vscode_extension(href)
            if extension:
                vscode_targets.add(extension)

    total_requests = len(github_targets) + len(pypi_targets) + len(vscode_targets)
    pool_size = 1 if no_concurrency else min(16, max(1, total_requests))
    session = build_session(pool_size=pool_size)

    with Progress(
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        "[progress.percentage]{task.percentage:>3.1f}%",
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        TimeRemainingColumn(),
    ) as progress:
        fetch_task = progress.add_task("Fetching stats...", total=total_requests)

        if no_concurrency:
            for repo in github_targets:
                github_cache[repo] = fetch_github_stars_forks(session, repo)
                progress.advance(fetch_task)
            for package in pypi_targets:
                pypi_cache[package] = fetch_pepy_downloads(session, package)
                progress.advance(fetch_task)
            for ext in vscode_targets:
                vscode_cache[ext] = fetch_vscode_downloads(session, ext)
                progress.advance(fetch_task)
        else:
            with ThreadPoolExecutor(max_workers=pool_size) as executor:
                futures = {}
                for repo in github_targets:
                    f = executor.submit(fetch_github_stars_forks, session, repo)
                    futures[f] = ("github", repo)
                for package in pypi_targets:
                    f = executor.submit(fetch_pepy_downloads, session, package)
                    futures[f] = ("pypi", package)
                for ext in vscode_targets:
                    f = executor.submit(fetch_vscode_downloads, session, ext)
                    futures[f] = ("vscode", ext)

                for future in as_completed(futures):
                    category, key = futures[future]
                    try:
                        result_data = future.result()
                        if category == "github":
                            github_cache[key] = result_data
                        elif category == "pypi":
                            pypi_cache[key] = result_data
                        elif category == "vscode":
                            vscode_cache[key] = result_data
                    except Exception as e:
                        error_msg = f"Thread exception: {e}"
                        if category == "github":
                            github_cache[key] = (None, error_msg)
                        elif category == "pypi":
                            pypi_cache[key] = (None, error_msg)
                        elif category == "vscode":
                            vscode_cache[key] = (None, error_msg)
                    progress.advance(fetch_task)

        # Now update cards using the cached data
        for card in cards:
            current = get_card_stat_values(card)

            stars_candidates: list[int | None] = [current.get("stars")]
            forks_candidates: list[int | None] = [current.get("forks")]
            downloads_candidates: list[int | None] = [current.get("downloads")]

            github_button = None
            pypi_button = None
            vscode_button = None
            for button in card.select("a.button"):
                href = (button.get("href") or "").strip()
                if not href:
                    continue
                if github_button is None and extract_github_repo(href):
                    github_button = button
                    stars_from_tip, forks_from_tip = parse_github_tooltip(button.get("data-tippy-content", ""))
                    stars_candidates.append(stars_from_tip)
                    forks_candidates.append(forks_from_tip)
                    continue
                if pypi_button is None and extract_pypi_package(href):
                    pypi_button = button
                    downloads_candidates.append(parse_download_tooltip(button.get("data-tippy-content", "")))
                    continue
                if vscode_button is None and extract_vscode_extension(href):
                    vscode_button = button
                    downloads_candidates.append(parse_download_tooltip(button.get("data-tippy-content", "")))

            if github_button is not None:
                repo = extract_github_repo((github_button.get("href") or "").strip())
                if repo:
                    github_stats, error = github_cache.get(repo, (None, "Not fetched"))
                    if github_stats is None:
                        failed += 1
                        if error:
                            fail_messages.append(f"{repo}: {error}")
                    else:
                        stars_candidates.append(github_stats[0])
                        forks_candidates.append(github_stats[1])

            if pypi_button is not None:
                package = extract_pypi_package((pypi_button.get("href") or "").strip())
                if package:
                    downloads, error = pypi_cache.get(package, (None, "Not fetched"))
                    if downloads is None:
                        failed += 1
                        if error:
                            fail_messages.append(f"{package}: {error}")
                    else:
                        downloads_candidates.append(downloads)

            if vscode_button is not None:
                package = extract_vscode_extension((vscode_button.get("href") or "").strip())
                if package:
                    downloads, error = vscode_cache.get(package, (None, "Not fetched"))
                    if downloads is None:
                        failed += 1
                        if error:
                            fail_messages.append(f"{package}: {error}")
                    else:
                        downloads_candidates.append(downloads)

            resolved_stars = pick_highest(*stars_candidates)
            resolved_forks = pick_highest(*forks_candidates)
            resolved_downloads = pick_highest(*downloads_candidates)

            text_updated += update_card_stats(
                card,
                stars=resolved_stars,
                forks=resolved_forks,
                downloads=resolved_downloads,
            )

            card_changed = False
            if github_button is not None and resolved_stars is not None and resolved_forks is not None:
                github_tip = f"{format_count(resolved_stars)} Stars, {format_count(resolved_forks)} Forks on GitHub"
                if github_button.get("data-tippy-content") != github_tip:
                    github_button["data-tippy-content"] = github_tip
                    updated += 1
                    card_changed = True

            if pypi_button is not None and resolved_downloads is not None:
                pypi_tip = f"{format_count(resolved_downloads)} Downloads on PyPI"
                if pypi_button.get("data-tippy-content") != pypi_tip:
                    pypi_button["data-tippy-content"] = pypi_tip
                    updated += 1
                    card_changed = True

            if vscode_button is not None and resolved_downloads is not None:
                vscode_tip = f"{format_count(resolved_downloads)} Downloads on VS Code Marketplace"
                if vscode_button.get("data-tippy-content") != vscode_tip:
                    vscode_button["data-tippy-content"] = vscode_tip
                    updated += 1
                    card_changed = True

            if not card_changed:
                untouched += 1

    html_after = str(soup)
    changed = (updated > 0) or (text_updated > 0)
    if changed:
        index_path.write_text(html_after, encoding="utf-8")

    return {
        "cards_total": len(cards),
        "updated": updated,
        "text_updated": text_updated,
        "untouched": untouched,
        "failed": failed,
        "fail_messages": fail_messages,
        "html_changed": changed,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--no-concurrency", action="store_true", help="Disable concurrent fetching (run sequentially)")
    args = parser.parse_args()

    result = update_index(Path("./index.html"), no_concurrency=args.no_concurrency)

    if args.json:
        output = {
            "summary": {
                "cards": result["cards_total"],
                "updated": result["updated"],
                "text_updated": result["text_updated"],
                "untouched": result["untouched"],
                "failed": result["failed"],
                "html_changed": result["html_changed"],
            },
            "failures": sorted(set(result["fail_messages"])) if result["fail_messages"] else []
        }
        print(json.dumps(output, indent=2))
    else:
        print(
            "Finished: "
            f"cards={result['cards_total']}, "
            f"updated={result['updated']}, "
            f"text_updated={result['text_updated']}, "
            f"untouched={result['untouched']}, "
            f"failed={result['failed']}, "
            f"html_changed={result['html_changed']}"
        )

        if result["fail_messages"]:
            unique_fail_messages = sorted(set(result["fail_messages"]))
            print("Failures:")
            for message in unique_fail_messages:
                print(f"- {message}")


if __name__ == "__main__":
    main()