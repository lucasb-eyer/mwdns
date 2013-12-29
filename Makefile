CSS_DIR=static/css
JS_DIR=static/js
MIN_DIR=static/min

JS_FILES=$(wildcard ${JS_DIR}/*.js)

all: less js

#compile, combine and minify less stylesheets
less: min_dir
	lessc -x ${CSS_DIR}/main_start.less ${MIN_DIR}/main_start.min.css
	lessc -x ${CSS_DIR}/main_game.less ${MIN_DIR}/main_game.min.css

#combine and minify js code
js: min_dir
	uglifyjs ${JS_FILES} -o ${MIN_DIR}/all.min.js

min_dir:
	mkdir -p ${MIN_DIR}

.PHONY: less js min_dir
