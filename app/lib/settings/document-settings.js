"use strict"
const Settings = require('./settings')

const DOCUMENT_SETTINGS_FILENAME = "document-settings.json"

class DocumentSettings extends Settings {
  DEFAULT_ENCODING = "UTF-8"
  DOCUMENT_KEY_PREFIX = "DOCKEY_"

  constructor ( settingsFileName = null, electronInstance = null ) {
    if (DocumentSettings._singleton) {
      return DocumentSettings._singleton
    }
    super( settingsFileName ?? DOCUMENT_SETTINGS_FILENAME, electronInstance )
    DocumentSettings._singleton = this
  }  

  _generateDocumentKey(documentPath) {
    return `${this.DOCUMENT_KEY_PREFIX}${documentPath}`
  }

  getDocumentEncoding(documentPath){
    let key = this._generateDocumentKey(documentPath)
    return this._settingsData[key] ?? this.DEFAULT_ENCODING
  }

  setDocumentEncoding(documentPath, encoding ){
    let key = this._generateDocumentKey(documentPath)
    if (encoding === this.DEFAULT_ENCODING) {
      delete this._settingsData[key]
    } else {
      this._settingsData[key] = encoding
    }
    this.save()
  }

  resetDocumentEncodings(){

  }
}

module.exports = DocumentSettings
