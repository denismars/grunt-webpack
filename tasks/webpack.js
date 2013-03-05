/*
 * grunt-webpack
 * https://github.com/sokra/grunt-webpack
 *
 * Copyright (c) 2012 Tobias Koppers @sokra
 * Licensed under the MIT license.
 */

var path = require("path");
module.exports = function(grunt) {

	var webpack = require("webpack");
	var CachePlugin = require("webpack/lib/CachePlugin");
	var ProgressPlugin = require("webpack/lib/ProgressPlugin");

	var targetCachePlugins = {};
	var targetDependencies = {};

	grunt.registerMultiTask('webpack', 'Webpack files.', function() {
		var done = this.async();

		// Get options from this.data
		var options = grunt.util._.merge(
			{
				context: ".",
				output: {
					path: "."
				}
			},
			grunt.config([this.name, "options"]),
			this.data,
			function(a, b) {
				return grunt.util._.isArray(a) && grunt.util._.isArray(b) ? a.concat(b) : undefined;
			}
		);
		options.context = path.resolve(process.cwd(), options.context);
		options.output.path = path.resolve(process.cwd(), options.output.path);

		var target = this.target;
		var cache = options.cache;
		options.cache = false;
		var storeStatsTo = options.storeStatsTo;
		var compiler = webpack(options);

		if(cache) {
			var theCachePlugin = targetCachePlugins[target];
			if(!theCachePlugin) {
				theCachePlugin = targetCachePlugins[target] = new CachePlugin();
			}
			compiler.apply(theCachePlugin);
			if(targetDependencies[target]) {
				compiler._lastCompilationFileDependencies = targetDependencies[target].file;
				compiler._lastCompilationContextDependencies = targetDependencies[target].context;
			}
		}

		var chars = 0;
		compiler.apply(new ProgressPlugin(function(percentage, msg) {
			if(percentage < 1) {
				percentage = Math.floor(percentage * 100);
				msg = percentage + "% " + msg;
				if(percentage < 100) msg = " " + msg;
				if(percentage < 10) msg = " " + msg;
			}
			for(; chars > msg.length; chars--)
				grunt.log.write("\b \b");
			chars = msg.length;
			for(var i = 0; i < chars; i++)
				grunt.log.write("\b");
			grunt.log.write(msg);
		}));

		compiler.run(function(err, stats) {
			if(cache) {
				targetDependencies[target] = {
					file: compiler._lastCompilationFileDependencies,
					context: compiler._lastCompilationContextDependencies
				};
			}
			if(err) {
				grunt.log.error(err);
				return done(false);
			}

			grunt.log.notverbose.writeln(stats.toString({
				colors: true,
				hash: false,
				timings: false,
				assets: true,
				chunks: false,
				chunkModules: false,
				modules: false,
				children: true
			}));
			grunt.verbose.writeln(stats.toString({
				colors: true
			}));
			if(typeof storeStatsTo === "string") {
				grunt.config.set(storeStatsTo, stats.toJson());
			}
			if(options.failOnError && stats.hasErrors())
				return done(false);
			done();
		});
	});

};
