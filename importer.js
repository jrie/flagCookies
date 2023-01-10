'use strict'

// Chrome
const useChrome = typeof (browser) === 'undefined'

// --------------------------------------------------------------------------------------------------------------------------------
// Called in frontend/UI
function importSettings (evt) {
  doImportOverwrite = document.querySelector('#confirmImportOverwrite').classList.contains('active')
  if (evt.target.files[0] === undefined) return

  const file = evt.target.files[0]

  JSZip.loadAsync(file).then(function (zip) {
    if (zip.files['flagCookieSettings.json'] === undefined) return

    zip.files['flagCookieSettings.json'].async('string').then(async function (stringData) {
      const data = JSON.parse(stringData)

      if (doImportOverwrite) {
        if (!useChrome) browser.storage.local.set(data)
        else chrome.storage.local.set(data)
        window.alert('Settings succesfully imported, you can close this window.')
        return
      }

      if (!useChrome) {
        const existingData = await browser.storage.local.get()
        browser.storage.local.set(mergeData(existingData, data))
        window.alert('Settings succesfully imported, you can close this window.')
        return
      }

      chrome.storage.local.get(null, function (existingData) {
        chrome.storage.local.set(mergeData(existingData, data))
        window.alert('Settings succesfully imported, you can close this window.')
      })
    })
  })
}

// --------------------------------------------------------------------------------------------------------------------------------

function mergeData (existingData, data) {
  const flagCookieSettings = ['flagCookies_logged', 'flagCookies_flagGlobal', 'flagCookies_autoflag', 'flagCookies_notifications', 'flagCookies_darkTheme']
  for (const key of Object.keys(data)) {
    if (flagCookieSettings.indexOf(key) === -1) {
      if (existingData[key] === undefined) existingData[key] = data[key]
      else {
        for (const domain of Object.keys(data[key])) {
          if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
          else {
            for (const setDomain of Object.keys(data[key][domain])) {
              if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain]
              else {
                for (const cookieKey of Object.keys(data[key][domain][setDomain])) {
                  if (existingData[key][domain][setDomain][cookieKey] === undefined) existingData[key][domain][setDomain][cookieKey] = data[key][domain][setDomain][cookieKey]
                }
              }
            }
          }
        }
      }
    } else {
      if (key === 'flagCookies_logged') {
        if (existingData[key] === undefined) existingData[key] = data[key]
        else {
          for (const domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
            else {
              for (const setDomain of Object.keys(data[key][domain])) {
                if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain]
                else {
                  for (const cookieKey of Object.keys(data[key][domain][setDomain])) {
                    if (existingData[key][domain][setDomain][cookieKey] === undefined) existingData[key][domain][setDomain][cookieKey] = data[key][domain][setDomain][cookieKey]
                  }
                }
              }
            }
          }
        }
      } else if (key === 'flagCookies_autoFlag') {
        if (existingData[key] === undefined) existingData[key] = data[key]
        else {
          for (const domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
          }
        }
      } else if ((key === 'flagCookies_flagGlobal' || key === 'flagCookies_notifications' || key === 'flagCookies_darkTheme')) existingData[key] = data[key]
    }
  }

  return existingData
}

function toggleImportOverwrite (evt) {
  if (!evt.target.classList.contains('active')) evt.target.classList.add('active')
  else evt.target.classList.remove('active')
}

let doImportOverwrite = false
document.querySelector('#confirmImportOverwrite').addEventListener('click', toggleImportOverwrite)
document.querySelector('#importFile').addEventListener('change', importSettings)
