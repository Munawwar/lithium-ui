require('./setup');

//Run tests
//System.import('./core/Template/test.js');
//System.import('./core/Observable/test.js');
System.import('./test/core/test.js').catch (function (e) {
    console.error(e);
})
