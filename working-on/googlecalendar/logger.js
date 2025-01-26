// logger.js
const Logger = {
    styles: {
      error: 'background: #ff0033; color: white; padding: 2px 5px; border-radius: 2px;',
      warning: 'background: #ffcc00; color: black; padding: 2px 5px; border-radius: 2px;',
      info: 'background: #00cc99; color: white; padding: 2px 5px; border-radius: 2px;',
      debug: 'background: #0066ff; color: white; padding: 2px 5px; border-radius: 2px;',
      success: 'background: #00cc00; color: white; padding: 2px 5px; border-radius: 2px;',
    },
  
    error: (message, data = null) => {
      console.log('%c Error ', Logger.styles.error, new Date().toISOString());
      console.log(message);
      if (data) console.log(data);
    },
  
    warning: (message, data = null) => {
      console.log('%c Warning ', Logger.styles.warning, new Date().toISOString());
      console.log(message);
      if (data) console.log(data);
    },
  
    info: (message, data = null) => {
      console.log('%c Info ', Logger.styles.info, new Date().toISOString());
      console.log(message);
      if (data) console.log(data);
    },
  
    debug: (message, data = null) => {
      console.log('%c Debug ', Logger.styles.debug, new Date().toISOString());
      console.log(message);
      if (data) console.log(data);
    },
  
    success: (message, data = null) => {
      console.log('%c Success ', Logger.styles.success, new Date().toISOString());
      console.log(message);
      if (data) console.log(data);
    },
  
    groupStart: (label) => {
      console.group(label);
    },
  
    groupEnd: () => {
      console.groupEnd();
    }
  };
  
  export default Logger;