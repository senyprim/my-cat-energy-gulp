const ALL_FILE = "*.*";
const BITMAP_FILE = ["png", "jpg", "gif"];
const SVG_FILE = ["svg"];
const bitmapImg = `*.{${BITMAP_FILE.join(",")}}`;
const svgImg = `*.{${SVG_FILE.join(",")}}`;
const SPRITE_FILES = ["*.svg"];
const SPRITE_SUFFICS = ["inline", "sprite"];

const pathDir = require("path");
const gulp = require("gulp");
const plumber = require("gulp-plumber");
const sourcemaps = require("gulp-sourcemaps");
const sass = require("gulp-sass")(require("sass"));
const htmlmin = require("gulp-htmlmin");
const posthtml = require("gulp-posthtml");
const include = require("posthtml-include");
const svgsprite = require("gulp-svg-sprite");
const browserSync = require("browser-sync");
const prefixer = require("gulp-autoprefixer");
const cssmin = require("gulp-clean-css");
const concat = require("gulp-concat");
const rimraf = require("rimraf");
const imagemin = require("gulp-imagemin");
const woff = require("gulp-ttf2woff");
const woff2 = require("gulp-ttf2woff2");
const webp = require("gulp-webp");
const merge = require("merge-stream");

const scriptsLib = ["./node_modules/slick-slider/slick/slick.min.js"];
const stilesLib = [
  "./node_modules/normalize.css/normalize.css",
  "./node_modules/slick-slider/slick/slick.css",
];

const path = {
  build: {
    //Тут мы укажем куда складывать готовые после сборки файлы
    html: "build/",
    js: "build/js/",
    css: "build/css/",
    img: "build/img/",
    fonts: "build/fonts/",
  },
  src: {
    //Пути откуда брать исходники
    html: "src/*.html", //Синтаксис src/*.html говорит gulp что мы хотим взять все файлы с расширением .html
    js: "src/js/*.js", //В стилях и скриптах нам понадобятся только main файлы
    style: "src/sass/style.scss",
    img: "src/img/**/", //Синтаксис img/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
    img_min: "src/img-min/", //Каталог минифицированных изображений - чтобы не надобыло минифицировать постоянно
    fonts: "src/fonts/",
  },
  watch: {
    //Тут мы укажем, за изменением каких файлов мы хотим наблюдать
    src: "src/",
    build: "build/",
    html: "src/*.html",
    js: "src/js/**/*.js",
    style: "src/sass/**/*.scss",
    img: "src/img/**/*.*",
    img_min: "src/img-min/**/*.*",
    fonts: "src/fonts/**/*.*",
  },
  clean: ["./build", "./src/img-min"],
};
//Удаление папок
const clean = (cb) => {
  return rimraf(`{${path.clean.join(",")}}`, cb);
};
//Сервер
const server = (done) => {
  browserSync.init({
    server: {
      baseDir: path.build.html,
    },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
};
const reload = (cb) => {
  browserSync.reload();
  cb();
};
exports.server = server;
exports.reload = reload;
const ttfToWoff = () => {
  //TODO
  return gulp
    .src("src/fonts/**/*.ttf")
    .pipe(woff())
    .pipe(gulp.dest(path.src.fonts));
};
const ttfToWoff2 = () => {
  //TODO
  return gulp
    .src("src/fonts/**/*.ttf")
    .pipe(woff2())
    .pipe(gulp.dest(path.src.fonts));
};
const copyFonts = () => {
  return gulp.src("src/fonts/**/*.*").pipe(gulp.dest(path.build.fonts));
};
const fonts = gulp.series(gulp.parallel(ttfToWoff, ttfToWoff2), copyFonts);

exports.fonts = fonts;

// HTML
const html = () => {
  return gulp
    .src(path.src.html, { allowEmpty: true })
    .pipe(plumber())
    .pipe(posthtml([include()])) //Проверим include  в html
    .pipe(sourcemaps.init())
    .pipe(
      htmlmin({
        minifyJS: true,
        minifyURLs: true,
        collapseWhitespace: false,
        removeComments: true,
        sortAttributes: true,
        sortClassName: true,
      })
    )
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.build.html)); //Выплюнем их в папку build
};
const stylesLib = () => {
  return gulp
    .src(stilesLib, { allowEmpty: true })
    .pipe(plumber())
    .pipe(concat("lib.css"))
    .pipe(prefixer()) //Добавим вендорные префиксы
    .pipe(cssmin()) //Сожмем
    .pipe(gulp.dest(path.build.css)); //И в build
};
const style = () => {
  return gulp
    .src(path.src.style, { allowEmpty: true }) //Выберем наш главный стиль
    .pipe(plumber())
    .pipe(sourcemaps.init()) //То же самое что и с js
    .pipe(sass()) //Скомпилируем
    .pipe(prefixer()) //Добавим вендорные префиксы
    .pipe(cssmin()) //Сожмем
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.build.css)); //И в build
};
exports.style = style;

const bitMapImage = () => {
  return (
    gulp
      .src(path.src.img + "*.*",{ since: gulp.lastRun(createWebp) })

      //.src(path.src.img + '/*.jpg', { allowEmpty: true, since: gulp.lastRun(bitMapImage) }) //Выберем каталог изображений измененных с последнего раза
      .pipe(
        imagemin([
          imagemin.gifsicle({ interlaced: true }),
          imagemin.mozjpeg({ quality: 60, progressive: true }),
          imagemin.optipng({ optimizationLevel: 3 }),
        ])
      )
      .pipe(gulp.dest(path.build.img))
  ); //И бросим в минифицированные
};
exports.bitMapImage = bitMapImage;

const createWebp = () => {
  return gulp
    .src(path.src.img + bitmapImg, { since: gulp.lastRun(createWebp) })
    .pipe(webp({ quality: 60 }))
    .pipe(gulp.dest(path.build.img));
};
exports.webp = createWebp;
const svgImage = () => {
  return gulp
    .src(path.src.img + svgImg, `!${SPRITE_FILES}`, { allowEmpty: true }) //Выберем каталог svg изображений
    .pipe(imagemin([imagemin.svgo()]))
    .pipe(gulp.dest(path.build.img)); //И бросим в минифицированные
};

//Создает спрайты по шаблону из массива SPRITE_SUFFICS ([name]-*.svg)
//Чтобы объединить несколько потоков в один применяем merge-stream
const svgSprites = () => {
  return merge(
    SPRITE_SUFFICS.map(function (spriteName) {
      return (
        gulp
          .src(path.src.img + spriteName + "-" + SPRITE_FILES, {
            allowEmpty: true,
          }) //Выберем каталог svg изображений
          //.on("data", (file) => console.log(file.path))
          .pipe(
            svgsprite({
              mode: {
                stack: {
                  sprite: `../${spriteName}.svg`,
                },
              },
            })
          )
          .pipe(gulp.dest(path.build.img))
      );
    })
  );
};
exports.svgSprites = svgSprites;

const watcher = () => {
  gulp.watch(path.watch.html, gulp.series(html, reload));
  gulp.watch(
    path.watch.img,
    gulp.series(gulp.parallel(bitMapImage, svgImage, svgSprites,createWebp)),
    reload
  );
  gulp.watch(path.watch.style, gulp.series(style, reload));
};

const build = gulp.series(
  clean,
  svgSprites,
  gulp.parallel(fonts, style, stylesLib, html, bitMapImage, svgImage,createWebp)
);

exports.build = build;
exports.default = gulp.series(build, server, watcher);
