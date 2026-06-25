import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type CameraPermissionState = 'granted' | 'denied' | 'prompt';

export async function ensureCameraPermission(): Promise<CameraPermissionState> {
  if (!Capacitor.isNativePlatform()) {
    return 'granted';
  }

  const current = await Camera.checkPermissions();

  if (current.camera === 'granted' || current.camera === 'limited') {
    return 'granted';
  }

  const requested = await Camera.requestPermissions({ permissions: ['camera'] });

  if (requested.camera === 'granted' || requested.camera === 'limited') {
    return 'granted';
  }

  if (requested.camera === 'denied') {
    return 'denied';
  }

  return 'prompt';
}
