// some of the codecs supported by the iconv-lite library
const ENCODINGS = [
  "UTF-8",
  "ASCII",
  "Base64",
  "ISO-8859-1",
  "ISO-8859-2",
  "ISO-8859-3",
  "ISO-8859-4",
  "ISO-8859-5",
  "ISO-8859-6",
  "ISO-8859-7",
  "ISO-8859-8",
  "ISO-8859-10",
  "ISO-8859-13",
  "ISO-8859-14",
  "ISO-8859-15",
  "ISO-8859-16",
  "IBM866",
  "KOI8-R",
  "KOI8-U",
  "macintosh",
  "windows-874",
  "windows-1250",
  "windows-1251",
  "windows-1252",
  "windows-1253",
  "windows-1254",
  "windows-1255",
  "windows-1256",
  "windows-1257",
  "windows-1258",
  "GBK",
  "gb18030",
  "Big5",
  "Shift_JIS",
  "EUC-JP",
  "EUC-KR",
  "UTF-16",
  "UTF-16 (BE)",
  "UTF-16 (LE)",
  "UTF-32",
  "UTF-32 (BE)",
  "UTF-32 (LE)"
]

/**
 * ANALYZE CODECS
 * !!! for development purpose only !!!
 */
function analyzeCodecs() {
  
  function _canonicalizeEncoding( encoding ) {
    return ( '' + encoding ).toLowerCase().replace( /:\d{4}$|[^0-9a-z]/g, "" );
  }
  
  function sortObj( obj ) {
    return Object.keys( obj ).sort().reduce( function ( result, key ) {
      result[key] = obj[key];
      return result;
    }, {} );
  }
  
  console.debug( 'ANALYZE CODECS ------------------ START' );
  let iconvlite_encodings = require( "./../../../node_modules/iconv-lite/encodings/index" );
  iconvlite_encodings = sortObj( iconvlite_encodings )
  // Check the list of encodings in mdview
  ENCODINGS.forEach( e => {
    let codecCanonicalName = _canonicalizeEncoding( e )
    console.debug( `${e} (${codecCanonicalName}) -> ${typeof iconvlite_encodings[codecCanonicalName]}` );
    // console.debug(encodings[ eCanonicalName ]);
  } );
  console.debug( 'ANALYZE CODECS ------------------' );
  // check the list of iconv-lite codecs (without aliases)
  for ( const enc in iconvlite_encodings ) {
    if ( ['function', 'object'].includes( typeof iconvlite_encodings[enc] ) ) {
      console.debug( `TYPE: ${typeof iconvlite_encodings[enc]} ENCODING: ${enc}` );
      //  console.debug(encodings[enc]);
    }
  }
  console.debug( 'ANALYZE CODECS ------------------ END' );
}

function toMenuItemID( encoding ) {
  return `encoding-${encoding}`
}

module.exports.ENCODINGS = ENCODINGS
module.exports.toMenuItemID = toMenuItemID
module.exports.analyzeCodecs= analyzeCodecs
