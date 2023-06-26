'use strict';

const { OAuth2App } = require('homey-oauth2app');
const SpotifyOAuth2Client = require('./SpotifyOAuth2Client');

module.exports = class SpotifyApp extends OAuth2App {

  static OAUTH2_DEBUG = false;
  static OAUTH2_CLIENT = SpotifyOAuth2Client;

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.homey.flow.getActionCard('pause_everywhere')
      .registerRunListener(async () => {
        await this.pause();
      });

    this.homey.flow.getActionCard('prev_everywhere')
      .registerRunListener(async () => {
        await this.prev();
      });

    this.homey.flow.getActionCard('next_everywhere')
      .registerRunListener(async () => {
        await this.next();
      });

    try {
      this.getFirstSavedOAuth2Client();
    } catch (err) {
      this.error(err);
    }
  }

  async prev() {
    const oAuth2Client = this.getFirstSavedOAuth2Client();
    await oAuth2Client.prev();
  }

  async next() {
    const oAuth2Client = this.getFirstSavedOAuth2Client();
    await oAuth2Client.next();
  }

  async pause() {
    const oAuth2Client = this.getFirstSavedOAuth2Client();
    await oAuth2Client.pause();
  }

};
