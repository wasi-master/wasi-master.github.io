import requests
from bs4 import BeautifulSoup
from rich.progress import Progress, BarColumn, TextColumn, TimeElapsedColumn, TimeRemainingColumn, MofNCompleteColumn

# Define the functions to get stars, forks, and downloads
def get_github_stars_and_forks(repo_url):
    # Extract the username and repository name from the URL
    username, repo_name = repo_url.rstrip('/').split('/')[-2:]
    # Construct the API URL
    api_url = f"https://api.github.com/repos/{username}/{repo_name}"
    # Make the API call
    response = requests.get(api_url)
    
    # Check if the request was successful
    if response.status_code == 200:
        data = response.json()
        # Extract stars and forks count
        stars = data.get("stargazers_count", 0)
        forks = data.get("forks_count", 0)
        return stars, forks
    else:
        # Handle errors (e.g., repository not found)
        return 0, 0

def get_pypi_downloads(package_url):
    # Extract package name from the URL
    package_name = package_url.rstrip('/').split('/')[-1]
    # Construct the API URL
    api_url = f"https://api.pepy.tech/api/v2/projects/{package_name}"
    # Make the API call
    headers = {
        "X-Api-Key": "ZbKqii6xOIiQlAGytUm+tBKXD9pSH+gM"
    }
    response = requests.get(api_url, headers=headers)
    
    # Check if the request was successful
    if response.status_code == 200:
        data = response.json()
        # Extract total downloads
        total_downloads = data.get("total_downloads", 0)
        return total_downloads
    else:
        # Handle errors (e.g., package not found)
        return 0

with open("./index.html", "r", encoding='utf-8') as file:
    html_content = file.read()

soup = BeautifulSoup(html_content, 'html.parser')


# Iterate over each button with a detailed progress bar
with Progress(
    TextColumn("[bold blue]{task.description}"),
    BarColumn(),
    "[progress.percentage]{task.percentage:>3.1f}%",
    MofNCompleteColumn(),
    TimeElapsedColumn(),
    TimeRemainingColumn()
) as progress:
    task = progress.add_task("Processing buttons...", total=len(soup.find_all('a', class_='button')))
    for button in soup.find_all('a', class_='button'):
        href = button.get('href')
        if 'github.com' in href and 'readme' not in href.lower():
            stars, forks = get_github_stars_and_forks(href)
            button['data-tippy-content'] = f"{stars} Stars, {forks} Forks"
        elif 'pypi.org' in href:
            downloads = get_pypi_downloads(href)
            button['data-tippy-content'] = f"{downloads} Downloads"
        progress.advance(task)

# Save the updated HTML
updated_html = soup.prettify()
with open("./index.html", "w", encoding='utf-8') as file:
    file.write(updated_html)