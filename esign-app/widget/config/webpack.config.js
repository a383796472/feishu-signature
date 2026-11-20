const { VueLoaderPlugin } = require("vue-loader");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const {
    BitableAppWebpackPlugin,
    opdevMiddleware,
} = require("@lark-opdev/block-bitable-webpack-utils");

const AutoImport = require("unplugin-auto-import/webpack");
const Components = require("unplugin-vue-components/webpack");
const { ElementPlusResolver } = require("unplugin-vue-components/resolvers");

/**
 * 读取 .env 文件（无需额外依赖），优先级：系统环境变量 > .env.{NODE_ENV} > .env
 */
function loadEnv() {
    const fs = require("fs");
    const env = {};
    [".env", `.env.${process.env.NODE_ENV || "development"}`].forEach((file) => {
        const filePath = path.resolve(__dirname, "..", file);
        if (!fs.existsSync(filePath)) return;
        fs.readFileSync(filePath, "utf-8")
            .split(/\r?\n/)
            .forEach((line) => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (!match) return;
                let value = (match[2] || "").trim();
                if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
                env[match[1]] = value;
            });
    });
    return env;
}

const fileEnv = loadEnv();
const apiBaseUrl = process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || "";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

const config = {
    entry: "./src/main.ts",
    devtool: isProduction ? false : "inline-source-map",
    mode: isDevelopment ? "development" : "production",
    stats: "errors-only",
    resolve: {
        extensions: [".ts", ".js", ".vue", ".json"],
        alias: {
            "@shared": path.resolve(__dirname, "../../shared"),
        },
    },
    output: {
        path: path.resolve(__dirname, "../dist"),
        clean: true,
        publicPath: isDevelopment ? "/block/" : "./",
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                use: "vue-loader",
            },
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "esbuild-loader",
                        options: { target: "es2015", loader: "ts" },
                    },
                ],
            },
            {
                test: /\.js$/,
                include: [/node_modules\/@lark-open/],
                use: ["source-map-loader"],
                enforce: "pre",
            },
            {
                test: /\.css$/,
                use: [isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(png|jpg|jpeg|gif|ico|svg)$/,
                type: "asset/resource",
                generator: {
                    filename: "assets/[name][ext][query]",
                },
            },
        ],
    },
    plugins: [
        ...(isDevelopment ? [new webpack.ProgressPlugin()] : [new MiniCssExtractPlugin()]),

        new webpack.DefinePlugin({
            "process.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
            "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
        }),

        new BitableAppWebpackPlugin({
            // open: true, // 控制是否自动打开多维表格
        }),

        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "./public/index.html",
            publicPath: isDevelopment ? "/block/" : "./",
        }),

        new VueLoaderPlugin(),

        AutoImport({
            resolvers: [ElementPlusResolver()],
            dts: false,
        }),
        Components({
            resolvers: [ElementPlusResolver()],
            dts: false,
        }),
    ],
    optimization: {
        minimize: isProduction,
        minimizer: [new ESBuildMinifyPlugin({ target: "es2015", css: true })],
        moduleIds: "deterministic",
        runtimeChunk: true,
        splitChunks: {
            chunks: "all",
            cacheGroups: {
                vendor: {
                    name: "vendor",
                    test: /[\\/]node_modules[\\/]/,
                    chunks: "all",
                },
            },
        },
    },
    devServer: isProduction
        ? undefined
        : {
              hot: true,
              client: {
                  logging: "error",
              },
              setupMiddlewares: (middlewares, devServer) => {
                  if (!devServer || !devServer.app) {
                      throw new Error("webpack-dev-server is not defined");
                  }
                  middlewares.push(opdevMiddleware(devServer));
                  return middlewares;
              },
          },
    cache: {
        type: "filesystem",
        buildDependencies: {
            config: [__filename],
        },
    },
};

module.exports = config;
