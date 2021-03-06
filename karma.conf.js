module.exports = function( config ) {
  config.set({
    basePath: '',
    autoWatch: true,
    frameworks: [ 'qunit' ],
    files: [
      // Because of dependency resolution, we need to specify all files in order
      // instead of using **/*.js.
      'assets/components/jquery/dist/jquery.js',
      'assets/components/underscore/underscore.js',
      'assets/components/backbone/backbone.js',
      'assets/components/nanoscroller/bin/javascripts/jquery.nanoscroller.js',
      'app/js/models.js',
      'app/js/views.js',
      'app/js/core.js',
      'tests/**/*.js'
    ],
    browsers: [ 'PhantomJS' ],
    phantomjsLauncher: {
      exitOnResourceError: true
    },
    reporters: [ 'progress', 'coverage', 'coveralls' ],
    preprocessors: { 'app/**/*.js': [ 'coverage' ] },
    singleRun: true,
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    }
  });
};
