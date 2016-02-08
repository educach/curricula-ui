module.exports = function( config ) {
  config.set({
    basePath: '',
    autoWatch: true,
    frameworks: [ 'qunit' ],
    files: [
      // Because of dependency resolution, we need to specify all files in order
      // instead of using **/*.js.
      'assets/components/jquery/jquery.js',
      'assets/components/underscore/underscore.js',
      'assets/components/backbone/backbone.js',
      'assets/components/nanoscroller/bin/javascripts/jquery.nanoscroller.js',
      'app/js/models.js',
      'app/js/views.js',
      'app/js/core.js',
      'tests/**/*.js'
    ],
    browsers: [ 'Firefox' ],
    reporters: [ 'progress', 'coverage' ],
    preprocessors: { 'app/**/*.js': [ 'coverage' ] },
    singleRun: true
  });
};
