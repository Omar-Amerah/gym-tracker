const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath.includes("node_modules\\expo-sqlite\\build") ||
    context.originModulePath.includes("node_modules/expo-sqlite/build")
  ) {
    if (moduleName.startsWith("./") && !moduleName.endsWith(".js")) {
      return context.resolveRequest(context, `${moduleName}.js`, platform);
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
