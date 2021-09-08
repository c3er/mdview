"use strict"

const fs = require( "fs" )
const path = require( "path" )

const SETTINGS_DIRECTORY = "Storage"
const DEFAULT_SETTINGS_FILENAME = "default-storage.json"

function _checkName (input_name, default_name) {
  return ( input_name == null || input_name === "" ) ? default_name : input_name
}

class Settings {
  _settingsPath
  _settingsFile
  _settingsData
  _electronInstance

  constructor ( settingsFileName, electronInstance = null ) {
    this._electronInstance = electronInstance ?? require( "electron" )
    this._settingsPath = path.join( this._electronInstance.app.getPath( "userData" ), SETTINGS_DIRECTORY )
    fs.mkdirSync( this._settingsPath, { recursive: true } )
    this._settingsFile = path.join( this._settingsPath, _checkName(settingsFileName, DEFAULT_SETTINGS_FILENAME) )
    this._settingsData = fs.existsSync( this._settingsFile ) ? JSON.parse( fs.readFileSync( this._settingsFile, "utf8" ) ) : {}
  }

  save() {
    try {
      fs.writeFileSync( this._settingsFile, JSON.stringify( this._settingsData ) )
    } catch ( error ) {
      console.error( error )
    }
  }

}

module.exports = Settings
