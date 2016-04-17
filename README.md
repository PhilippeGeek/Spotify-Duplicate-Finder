# Spotify Duplicate Finder
This app lets you find duplicates in your Spotify playlists.

## Deploy to Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Usage
When using the application, you should first login with Spotify. The app only requests access to your private and collaborative playlists.

After login, you can get all the playlists by clicking the `Refresh` button. It may take a while if you have many ones.

After playlists are loaded, you can click on any name to launch duplicates finding. This may also take a while as Spotify only allows me to retrieve tracks 100 by 100.

## Troubleshooting
If any request takes too much time, this may be because the token has expired. For the moment, no automatic refresh is implemented. You have to click the `Refresh token` button.
