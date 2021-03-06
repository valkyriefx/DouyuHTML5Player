function convertHeader (headers) {
  let out = {}
  for (let key of headers.keys()) {
    out[key] = headers.get(key)
  }
  return out
}
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'fetch') {
    console.log('new fetch port', port)
    let response
    let reader
    port.onDisconnect.addListener(() => {
      reader && reader.cancel()
    })
    port.onMessage.addListener(msg => {
      // console.log('fetch new msg', msg)
      let chain = Promise.resolve()
      if (msg.method === 'fetch') {
        chain = chain.then(() => fetch.apply(null, msg.args)).then(r => {
          response = r
          console.log('response', r)
          return {
            bodyUsed: r.bodyUsed,
            ok: r.ok,
            status: r.status,
            statusText: r.statusText,
            type: r.type,
            url: r.url,
            headers: convertHeader(r.headers)
          }
        })
      } else if (msg.method === 'json') {
        chain = chain.then(() => response.json())
      } else if (msg.method === 'body.getReader') {
        chain = chain.then(() => {
          reader = response.body.getReader()
          console.log('reader', reader)
        })
      } else if (msg.method === 'reader.read') {
        chain = chain.then(() => reader.read()).then(r => {
          // console.log('read', r)
          r.value = Array.from(r.value)
          return r
        })
      } else if (msg.method === 'reader.cancel') {
        chain = chain.then(() => reader.cancel())
      } else {
        port.disconnect()
        return
      }
      chain.then((...args) => {
        const outMsg = {
          method: msg.method,
          args: args
        }
        // console.log('fetch send msg', outMsg)
        port.postMessage(outMsg)
      }).catch(e => {
        console.log(e)
        port.postMessage({
          method: msg.method,
          err: {
            name: e.name,
            message: e.message,
            stack: e.stack,
            string: e.toString()
          }
        })
      })
    })
  }
})
const embed = document.createElement('embed')
embed.src = 'libs/JSocket.swf'
embed.wmode = 'transparent'
embed.width = '1px'
embed.height = '1px'
embed.allowScriptAccess = 'always'
embed.type = 'application/x-shockwave-flash'
document.body.appendChild(embed)