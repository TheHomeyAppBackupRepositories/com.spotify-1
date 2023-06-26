'use strict';

const { OAuth2Driver } = require('homey-oauth2app');

module.exports = class SpotifyConnectDriver extends OAuth2Driver {

  async onOAuth2Init() {
    // Flow Cards Capabilities
    this.homey.flow.getActionCard('play')
      .registerRunListener(async ({ device }) => {
        await device.onCapabilitySpeakerPlaying(true);
      });

    this.homey.flow.getActionCard('pause')
      .registerRunListener(async ({ device }) => {
        await device.onCapabilitySpeakerPlaying(false);
      });

    this.homey.flow.getActionCard('prev')
      .registerRunListener(async ({ device }) => {
        await device.onCapabilitySpeakerPrev();
      });

    this.homey.flow.getActionCard('next')
      .registerRunListener(async ({ device }) => {
        await device.onCapabilitySpeakerNext();
      });

    this.homey.flow.getActionCard('set_shuffle_true')
      .registerRunListener(async ({ device }) => {
        await device.onCapabilitySpeakerShuffle(true);
      });

    this.homey.flow.getActionCard('set_shuffle_false')
      .registerRunListener(async ({ device }) => {
        await device.onCapabilitySpeakerShuffle(false);
      });

    this.homey.flow.getActionCard('set_repeat')
      .registerRunListener(async ({ device, value }) => {
        return device.onCapabilitySpeakerRepeat(value);
      });

    this.homey.flow.getActionCard('volume_set')
      .registerRunListener(async ({ device, volume_set: value }) => {
        return device.onCapabilityVolumeSet(value);
      });

    // Flow Cards Spotify
    this.homey.flow.getActionCard('set_active')
      .registerRunListener(async ({ device }) => {
        return device.setActive();
      });

    this.homey.flow.getActionCard('play_playlist')
      .registerRunListener(async ({ device, playlist }) => {
        return device.playContext({ contextUri: playlist.uri });
      })
      .registerArgumentAutocompleteListener('playlist', (query, { device }) => {
        return this.onFlowPlayPlaylistAutocomplete({ query, device });
      });

    this.homey.flow.getActionCard('play_track')
      .registerRunListener(async ({ device, track }) => {
        return device.playTrack({ trackUri: track.uri });
      })
      .registerArgumentAutocompleteListener('track', (query, { device }) => {
        return this.onFlowPlayTrackAutocomplete({ query, device });
      });

    this.homey.flow.getActionCard('play_album')
      .registerRunListener(async ({ device, album }) => {
        return device.playContext({ contextUri: album.uri });
      })
      .registerArgumentAutocompleteListener('album', (query, { device }) => {
        return this.onFlowPlayAlbumAutocomplete({ query, device });
      });

    this.homey.flow.getActionCard('play_artist')
      .registerRunListener(async ({ device, artist }) => {
        return device.playContext({ contextUri: artist.uri });
      })
      .registerArgumentAutocompleteListener('artist', (query, { device }) => {
        return this.onFlowPlayArtistAutocomplete({ query, device });
      });

    // Sync Device IDs
    // Spotify tends to change these over time, for the same device,
    // so we update them by matching the speaker name.
    Promise.resolve().then(async () => {
      const oAuth2Sessions = this.homey.app.getSavedOAuth2Sessions();
      if (Object.keys(oAuth2Sessions).length > 0) {
        const oAuth2Client = this.homey.app.getFirstSavedOAuth2Client();
        const spotifyDevices = await oAuth2Client.getDevices();
        const homeyDevices = this.getDevices();

        // Map Homey Devices to Spotify Devices
        homeyDevices.forEach(homeyDevice => {
          const { id } = homeyDevice.getStore();
          const name = homeyDevice.getName();

          const spotifyDevice = spotifyDevices.find(spotifyDevice => {
            return spotifyDevice.name === name || spotifyDevice.id === id;
          });
          if (!spotifyDevice) return;

          if (id !== spotifyDevice.id) {
            homeyDevice.updateId(spotifyDevice.id);
          }

          if (name !== spotifyDevice.name) {
            homeyDevice.updateName(spotifyDevice.name);
          }
        });
      }
    }).catch(this.error);
  }

  async onFlowPlayPlaylistAutocomplete({ device, query }) {
    return Promise.all([

      // Search User Playlists
      device.getUserPlaylists().then(items => {
        return items.filter(item => {
          return item.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
        });
      }),

      // Search Spotify Playlists
      (query.length > 3)
        ? device.searchPlaylists({ query }).then(({ playlists }) => {
          if (!Array.isArray(playlists.items)) return [];
          return playlists.items;
        })
        : undefined,

    ])
      .then(items => items.filter(item => !!item))
      .then(items => items.flat())
      .then(items => {
        return items.map(item => {
          let image;
          if (Array.isArray(item.images)) {
            const imageObj = item.images[item.images.length - 1];
            if (imageObj) {
              image = imageObj.url;
            }
          }

          return {
            image,
            uri: item.uri,
            name: item.name,
          };
        });
      });
  }

  async onFlowPlayTrackAutocomplete({ device, query }) {
    if (query.length < 3) return [];

    const { tracks } = await device.searchTracks({ query });
    if (!Array.isArray(tracks.items)) return [];

    return tracks.items.map(item => {
      let image;
      if (item.album && Array.isArray(item.album.images)) {
        const imageObj = item.album.images[item.album.images.length - 1];
        if (imageObj) {
          image = imageObj.url;
        }
      }
      return {
        image,
        uri: item.uri,
        name: item.name,
        description: item.artists.map(artist => {
          return artist.name;
        }).join(', '),
      };
    });
  }

  async onFlowPlayAlbumAutocomplete({ device, query }) {
    if (query.length < 3) return [];

    const { albums } = await device.searchAlbums({ query });
    if (!Array.isArray(albums.items)) return [];

    return albums.items.map(item => {
      let image;
      if (Array.isArray(item.images)) {
        const imageObj = item.images[item.images.length - 1];
        if (imageObj) {
          image = imageObj.url;
        }
      }

      return {
        image,
        uri: item.uri,
        name: item.name,
        description: item.artists.map(artist => {
          return artist.name;
        }).join(', '),
      };
    });
  }

  async onFlowPlayArtistAutocomplete({ device, query }) {
    if (query.length < 3) return [];

    const { artists } = await device.searchArtists({ query });
    if (!Array.isArray(artists.items)) return [];

    return artists.items.map(item => {
      let image;
      if (Array.isArray(item.images)) {
        const imageObj = item.images[item.images.length - 1];
        if (imageObj) {
          image = imageObj.url;
        }
      }

      return {
        image,
        uri: item.uri,
        name: item.name,
      };
    });
  }

  async onPairListDevices({ oAuth2Client }) {
    const devices = await oAuth2Client.getDevices();
    const pairedDevices = this.getDevices();
    const foundDevices = devices.filter(device => {
      this.log('Device:', device);
      if (device.is_restricted) return false;
      const pairedDevice = pairedDevices.find(pairedDevice => pairedDevice.id === device.id);
      if (pairedDevice) return false;
      return true;
    }).map(device => {
      return {
        name: device.name,
        data: {
          id: device.id,
        },
        store: {
          id: device.id,
          name: device.name,
        },
      };
    });

    if (!foundDevices.length) {
      throw new Error(this.homey.__('no_devices'));
    }

    return foundDevices;
  }

};
