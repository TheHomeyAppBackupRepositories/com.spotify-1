'use strict';

const {
  OAuth2Client,
} = require('homey-oauth2app');

module.exports = class SpotifyOAuth2Client extends OAuth2Client {

  static CACHE_TIMEOUT = 1000 * 60;
  static REPEAT_OFF = 'off';
  static REPEAT_TRACK = 'track';
  static REPEAT_CONTEXT = 'context';

  static API_URL = 'https://api.spotify.com/v1';
  static TOKEN_URL = 'https://accounts.spotify.com/api/token';
  static AUTHORIZATION_URL = 'https://accounts.spotify.com/authorize';
  static SCOPES = [
    'user-read-private',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-library-read',
    'user-top-read',
    'user-read-recently-played',
    'playlist-read-collaborative',
    'playlist-read-private',
  ];

  onHandleNotOK({ status, statusText, body }) {
    if (body && body.error && body.error.message) {
      return new Error(body.error.message);
    }
    return new Error(statusText);
  }

  async getDevices() {
    return this.get({
      path: '/me/player/devices',
    }).then(({ devices }) => devices);
  }

  async play({ deviceId, contextUri, uris } = {}) {
    const query = {};
    const json = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    if (contextUri) {
      json.context_uri = contextUri;
    }

    if (uris) {
      json.uris = uris;
    }

    return this.put({
      path: '/me/player/play',
      query,
      json,
    });
  }

  async pause({ deviceId } = {}) {
    const query = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    return this.put({
      path: '/me/player/pause',
      query,
    });
  }

  async prev({ deviceId } = {}) {
    const query = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    return this.post({
      path: '/me/player/previous',
      query,
    });
  }

  async next({ deviceId } = {}) {
    const query = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    return this.post({
      path: '/me/player/next',
      query,
    });
  }

  async setVolume({ deviceId, volume } = {}) {
    const query = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    if (typeof volume === 'number') {
      query.volume_percent = Math.round(volume);
    }

    return this.put({
      query,
      path: '/me/player/volume',
    });
  }

  async setShuffle({ deviceId, state } = {}) {
    const query = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    if (typeof state === 'boolean') {
      query.state = String(state);
    }

    return this.put({
      query,
      path: '/me/player/shuffle',
    });
  }

  async setRepeat({ deviceId, state } = {}) {
    const query = {};

    if (deviceId) {
      query.device_id = deviceId;
    }

    if (state) {
      query.state = state;
    }

    return this.put({
      query,
      path: '/me/player/repeat',
    });
  }

  async transferPlayback({ deviceId, play = false } = {}) {
    const json = {};

    if (deviceId) {
      json.device_ids = [deviceId];
    }

    if (typeof play === 'boolean') {
      json.play = play;
    }

    return this.put({
      json,
      path: '/me/player',
    });
  }

  async search({ query, type = 'playlist' }) {
    return this.get({
      query: {
        type,
        q: query,
      },
      path: '/search',
    });
  }

  async searchPlaylists({ query }) {
    return this.search({ query, type: 'playlist' });
  }

  async searchAlbums({ query }) {
    return this.search({ query, type: 'album' });
  }

  async searchArtists({ query }) {
    return this.search({ query, type: 'artist' });
  }

  async searchTracks({ query }) {
    return this.search({ query, type: 'track' });
  }

  // This method fetches all user's playlists (paginated)
  // and then caches the result
  async getUserPlaylists() {
    if (this._userPlaylistsCache) {
      return this._userPlaylistsCache;
    }

    const getUserPlaylists = async ({ limit = 50, offset = 0 }) => {
      const { items } = await this.get({
        path: '/me/playlists',
        query: { limit, offset },
      });
      if (!Array.isArray(items)) return [];
      return items;
    };

    let playlists = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await getUserPlaylists({ offset: playlists.length });
      playlists = playlists.concat(result);
      if (result.length < 50) break;
    }

    this._userPlaylistsCache = playlists;

    if (this._userPlaylistsCacheTimeout) {
      clearTimeout(this._userPlaylistsCacheTimeout);
    }

    this._userPlaylistsCacheTimeout = setTimeout(() => {
      this._userPlaylistsCache = null;
    }, this.constructor.CACHE_TIMEOUT);

    return this._userPlaylistsCache;
  }

  async getUserPlaybackState() {
    return this.get({
      path: '/me/player',
    });
  }

};
