export interface Environment {
  deviceId?: string;
  appPackage: string;
  appLaunchTarget: string;
}

export function getEnvironment(): Environment {
  const appPackage = process.env.MIABI_ANDROID_PACKAGE;
  if (!appPackage) {
    throw new Error(
      'MIABI_ANDROID_PACKAGE 未设置。参考 .env.example 配置被测 App 的包名。',
    );
  }

  return {
    deviceId: process.env.ANDROID_DEVICE_ID || undefined,
    appPackage,
    appLaunchTarget: process.env.MIABI_ANDROID_LAUNCH_TARGET || appPackage,
  };
}
