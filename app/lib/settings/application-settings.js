"use strict"

const Settings = require('./settings')

const APPLICATION_SETTINGS_FILENAME = "application-settings.json"

class ApplicationSettings extends Settings {
  THEME_KEY = "theme"
  LIGHT_THEME = "light"
  DARK_THEME = "dark"
  ALLOWED_THEMES = [this.LIGHT_THEME, this.DARK_THEME]
  _electronNativeTheme

  constructor ( settingsFileName = null, electronInstance = null ) {
    if (ApplicationSettings._singleton) {
      return ApplicationSettings._singleton
    }
    super( settingsFileName ?? APPLICATION_SETTINGS_FILENAME , electronInstance )
    ApplicationSettings._singleton = this
    this._electronNativeTheme = this._electronInstance.nativeTheme
  }

  get theme() {
    return this._settingsData[this.THEME_KEY] ?? this._electronNativeTheme.themeSource
  }

  set theme( value ) {
    if ( !this.ALLOWED_THEMES.includes( value ) ) {
      throw {
        message: `"${value}" is not one of the allowed values [${this.ALLOWED_THEMES.join( ", " )}]`,
      }
    }
    this._settingsData[this.THEME_KEY] = this._electronNativeTheme.themeSource = value
    this.save()
  }

}

module.exports = ApplicationSettings
