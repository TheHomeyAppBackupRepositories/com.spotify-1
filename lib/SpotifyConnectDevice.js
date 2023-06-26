'use strict';

const { OAuth2Device } = require('homey-oauth2app');
const SpotifyOAuth2Client = require('./SpotifyOAuth2Client');

const REPEAT_MAP = {
  none: SpotifyOAuth2Client.REPEAT_OFF,
  track: SpotifyOAuth2Client.REPEAT_TRACK,
  playlist: SpotifyOAuth2Client.REPEAT_CONTEXT,
};
module.exports = class SpotifyConnectDevice extends OAuth2Device {

  async onOAuth2Init() {
    const {
      name,
      id,
    } = this.getStore();

    this.name = name;
    this.id = id;

    this.log(`${this.name}@${this.id}`);

    // Migration from <5.0.0
    [
      'speaker_playing',
      'speaker_prev',
      'speaker_next',
      'speaker_shuffle',
      'speaker_repeat',
      'speaker_artist',
      'speaker_album',
      'speaker_track',
      'speaker_duration',
      'speaker_position',
      'volume_set',
    ].forEach(capabilityId => {
      if (this.hasCapability(capabilityId)) {
        this.log(`Removing ${capabilityId}...`);
        this.removeCapability(capabilityId).catch(this.error);
      }
    });
  }

  updateId(id) {
    if (this.id !== id) {
      this.log(`ID changed from ${this.id} to ${id}`);
      this.id = id;
      this.setStoreValue('id', id).catch(this.error);
    }
  }

  updateName(name) {
    if (this.name !== name) {
      this.log(`Name changed from ${this.name} to ${name}`);
      this.name = name;
      this.setStoreValue('name', name).catch(this.error);
    }
  }

  async onCapabilitySpeakerPrev() {
    await this.oAuth2Client.prev({
      deviceId: this.id,
    });
  }

  async onCapabilitySpeakerNext() {
    await this.oAuth2Client.next({
      deviceId: this.id,
    });
  }

  async onCapabilitySpeakerPlaying(value) {
    if (!value) {
      await this.oAuth2Client.pause({
        deviceId: this.id,
      });
    } else {
      await this.oAuth2Client.transferPlayback({
        deviceId: this.id,
        play: value,
      });
      await this.oAuth2Client.play({
        deviceId: this.id,
      });
    }
  }

  async onCapabilityVolumeSet(value) {
    const volume = value * 100;
    await this.oAuth2Client.setVolume({
      volume,
      deviceId: this.id,
    });
  }

  async onCapabilitySpeakerShuffle(value) {
    const state = !!value;
    await this.oAuth2Client.setShuffle({
      state,
      deviceId: this.id,
    });
  }

  async onCapabilitySpeakerRepeat(value) {
    const state = REPEAT_MAP[value];
    await this.oAuth2Client.setRepeat({
      state,
      deviceId: this.id,
    });
  }

  async setActive() {
    await this.oAuth2Client.transferPlayback({
      deviceId: this.id,
      play: true,
    });
  }

  async playContext({ contextUri }) {
    await this.oAuth2Client.play({
      contextUri,
      deviceId: this.id,
    });
  }

  async playTrack({ trackUri }) {
    await this.oAuth2Client.play({
      uris: [trackUri],
      deviceId: this.id,
    });
  }

  async searchPlaylists({ query }) {
    return this.oAuth2Client.searchPlaylists({ query });
  }

  async searchTracks({ query }) {
    return this.oAuth2Client.searchTracks({ query });
  }

  async searchAlbums({ query }) {
    return this.oAuth2Client.searchAlbums({ query });
  }

  async searchArtists({ query }) {
    return this.oAuth2Client.searchArtists({ query });
  }

  async getUserPlaylists() {
    return this.oAuth2Client.getUserPlaylists();
  }

};
