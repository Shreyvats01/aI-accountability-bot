export async function fetchGitHubActivity(username: string, token: string | null) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Accountability-Bot'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/users/${username}/events`;
  
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.statusText}`);
    }
    const events = await res.json();
    
    // Filter for today's events (UTC)
    const today = new Date().toISOString().split('T')[0];
    
    let commits = 0;
    let prs = 0;
    let reviews = 0;

    for (const event of events) {
      if (!event.created_at.startsWith(today)) continue;
      
      if (event.type === 'PushEvent') {
        commits += event.payload.commits?.length || 0;
      } else if (event.type === 'PullRequestEvent' && event.payload.action === 'opened') {
        prs += 1;
      } else if (event.type === 'PullRequestReviewEvent') {
        reviews += 1;
      }
    }

    // Capture raw event types for entity extraction (repo names, etc)
    const recentRepos = Array.from(new Set(
      events.filter((e: any) => e.created_at.startsWith(today)).map((e: any) => e.repo.name)
    ));

    return {
      commits,
      prs,
      reviews,
      rawContext: { recentRepos }
    };
  } catch (err) {
    console.error('Error fetching GitHub activity:', err);
    return null;
  }
}

export async function fetchGitHubHistory(username: string, token: string | null, days: number) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Accountability-Bot'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // Generate date threshold
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);

  let page = 1;
  const history: any[] = [];
  let keepFetching = true;

  try {
    while (keepFetching && page <= 10) { // Limit to 10 pages to avoid rate limits
      const url = `https://api.github.com/users/${username}/events?page=${page}&per_page=30`;
      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        break; // Assume end of available events or error
      }
      
      const events = await res.json();
      if (events.length === 0) break;

      for (const event of events) {
        const eventDate = new Date(event.created_at);
        if (eventDate < thresholdDate) {
          keepFetching = false;
          break;
        }

        if (event.type === 'PushEvent') {
          for (const commit of (event.payload.commits || [])) {
            history.push({
              platform: 'github',
              type: 'commit',
              content: commit.message,
              url: `https://github.com/${event.repo.name}/commit/${commit.sha}`,
              eventAt: eventDate,
              topics: [event.repo.name],
              sentiment: null,
            });
          }
        } else if (event.type === 'PullRequestEvent') {
          history.push({
            platform: 'github',
            type: 'pr',
            content: `${event.payload.action} PR: ${event.payload.pull_request?.title || ''}`,
            url: event.payload.pull_request?.html_url || null,
            eventAt: eventDate,
            topics: [event.repo.name],
            sentiment: null,
          });
        }
      }
      page++;
    }
  } catch (err) {
    console.error('Error fetching GitHub history:', err);
  }
  
  return history;
}
