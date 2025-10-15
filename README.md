This project relies on the Football-Data.org API and may throw errors in three cases:
  1. If requests are made too quickly, exceeding the per-minute limit (10 requests/min), the app will pause until the limit resets.
  2. If the daily API request limit is reached, match data will stop loading until the next day.
  3. Any other API errors (like invalid responses or server issues) may prevent matches from being displayed.
