import { describe, expect, it } from 'vitest'
import {
  desktopBuildRecordFilename,
  desktopUpdateMetadataFilename,
  resolveDesktopAutoUpdateConfig,
  resolveDesktopAutoUpdateEnvironment,
  resolveDesktopAutoUpdateTarget,
  resolveDesktopUploadConfig,
} from '../scripts/desktop-auto-update-environment.mjs'

const RELEASE_ID = '0123456789abcdef0123456789abcdef'

describe('desktop auto-update environment', () => {
  it.each([undefined, 'test'])('requires a release ID for deployment %s', (deployment) => {
    const environment = { HARNOVA_DESKTOP_AUTO_UPDATE_ENV: deployment, HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://updates.example.com',
      HARNOVA_DOWNLOAD_TEST_COS_BUCKET: 'test-bucket' }
    expect(() => resolveDesktopAutoUpdateConfig(environment, 'win32', 'x64')).toThrow(/HARNOVA_DOWNLOAD_TEST_RELEASE_ID/u)
    expect(() => resolveDesktopUploadConfig(environment, 'win32', 'x64')).toThrow(/HARNOVA_DOWNLOAD_TEST_RELEASE_ID/u)
  })

  it.each(['', ' ', 'release-1', 'a'.repeat(31), 'a'.repeat(33), 'A'.repeat(32), 'g'.repeat(32),
    '../feeds', '01234567-89ab-cdef-0123-456789abcdef', `${RELEASE_ID}/bin`])('rejects invalid test release ID %j', (id) => {
    const environment = { HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://updates.example.com', HARNOVA_DOWNLOAD_TEST_RELEASE_ID: id }
    expect(() => resolveDesktopAutoUpdateConfig(environment, 'darwin', 'arm64')).toThrow(/HARNOVA_DOWNLOAD_TEST_RELEASE_ID/u)
  })

  it.each([['darwin', 'arm64', 'mac-arm64'], ['darwin', 'x64', 'mac-x64'], ['win32', 'x64', 'win-x64']] as const)
  ('uses one test release directory for %s %s feeds and binaries', (platform, arch, target) => {
    expect(resolveDesktopAutoUpdateConfig({ HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://updates.example.com',
      HARNOVA_DOWNLOAD_TEST_RELEASE_ID: RELEASE_ID }, platform, arch)).toMatchObject({
      publicUrl: `https://updates.example.com/harnova-desktop/${RELEASE_ID}/feeds/${target}/`,
      keyPrefix: `harnova-desktop/${RELEASE_ID}/feeds/${target}`,
      binaryKeyPrefix: `harnova-desktop/${RELEASE_ID}/bin/${target}`,
    })
  })

  it('defaults packages and uploads to the test deployment', () => {
    expect(resolveDesktopAutoUpdateEnvironment({})).toBe('test')
    expect(resolveDesktopAutoUpdateConfig({
      HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com/',
      HARNOVA_DOWNLOAD_TEST_RELEASE_ID: RELEASE_ID,
    }, 'darwin', 'arm64')).toEqual({
      environment: 'test',
      target: 'mac-arm64',
      origin: 'https://desktop-updates.example.com',
      publicUrl: `https://desktop-updates.example.com/harnova-desktop/${RELEASE_ID}/feeds/mac-arm64/`,
      keyPrefix: `harnova-desktop/${RELEASE_ID}/feeds/mac-arm64`,
      binaryKeyPrefix: `harnova-desktop/${RELEASE_ID}/bin/mac-arm64`,
    })
    expect(resolveDesktopUploadConfig({
      HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com/',
      HARNOVA_DOWNLOAD_TEST_RELEASE_ID: RELEASE_ID,
      HARNOVA_DOWNLOAD_TEST_COS_BUCKET: 'test-download-bucket',
    }, 'darwin', 'arm64')).toMatchObject({
      bucket: 'test-download-bucket',
      secretIdEnvName: 'HARNOVA_DOWNLOAD_TEST_COS_SECRET_ID',
      secretKeyEnvName: 'HARNOVA_DOWNLOAD_TEST_COS_SECRET_KEY',
    })
  })

  it.each([undefined, RELEASE_ID, 'unused-test-value'])('keeps production paths independent of test release ID %s', (id) => {
    expect(resolveDesktopAutoUpdateConfig({
      HARNOVA_DESKTOP_AUTO_UPDATE_ENV: 'production',
      HARNOVA_DOWNLOAD_PROD_ORIGIN: 'https://updates.harnova.example',
      HARNOVA_DOWNLOAD_TEST_RELEASE_ID: id,
    }, 'win32', 'x64')).toMatchObject({
      environment: 'production',
      target: 'win-x64',
      publicUrl: 'https://updates.harnova.example/harnova-desktop/feeds/win-x64/',
      binaryKeyPrefix: 'harnova-desktop/bin/win-x64',
    })
    expect(resolveDesktopUploadConfig({
      HARNOVA_DESKTOP_AUTO_UPDATE_ENV: 'production',
      HARNOVA_DOWNLOAD_PROD_ORIGIN: 'https://updates.harnova.example',
      HARNOVA_DOWNLOAD_PROD_COS_BUCKET: 'production-download-bucket',
    }, 'win32', 'x64')).toMatchObject({
      bucket: 'production-download-bucket',
      secretIdEnvName: 'HARNOVA_DOWNLOAD_PROD_COS_SECRET_ID',
      secretKeyEnvName: 'HARNOVA_DOWNLOAD_PROD_COS_SECRET_KEY',
    })
  })

  it('requires the selected deployment origin for packages and bucket only for uploads', () => {
    expect(() => resolveDesktopAutoUpdateConfig({}, 'darwin', 'arm64'))
      .toThrow(/HARNOVA_DOWNLOAD_TEST_ORIGIN/u)
    expect(resolveDesktopAutoUpdateConfig({
      HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com',
      HARNOVA_DOWNLOAD_TEST_RELEASE_ID: RELEASE_ID,
    }, 'darwin', 'arm64').publicUrl).toContain('/mac-arm64/')
    expect(() => resolveDesktopUploadConfig({
      HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com',
      HARNOVA_DOWNLOAD_TEST_RELEASE_ID: RELEASE_ID,
    }, 'darwin', 'arm64')).toThrow(/HARNOVA_DOWNLOAD_TEST_COS_BUCKET/u)
    expect(() => resolveDesktopUploadConfig({
      HARNOVA_DESKTOP_AUTO_UPDATE_ENV: 'production',
      HARNOVA_DOWNLOAD_PROD_ORIGIN: 'https://updates.harnova.example',
    }, 'win32', 'x64')).toThrow(/HARNOVA_DOWNLOAD_PROD_COS_BUCKET/u)
  })

  it('rejects a test download URL that is not an HTTPS origin', () => {
    expect(() => resolveDesktopAutoUpdateConfig({
      HARNOVA_DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com/releases',
    }, 'darwin', 'arm64')).toThrow(/HTTPS origin without a path/u)
    expect(() => resolveDesktopAutoUpdateConfig({
      HARNOVA_DOWNLOAD_TEST_ORIGIN: 'http://desktop-updates.example.com',
    }, 'darwin', 'arm64')).toThrow(/HTTPS origin/u)
  })

  it.each(['test', 'production'] as const)('requires an independent %s update origin', (deployment) => {
    const key = deployment === 'test' ? 'HARNOVA_DOWNLOAD_TEST_ORIGIN' : 'HARNOVA_DOWNLOAD_PROD_ORIGIN'
    const inherited = { HARNOVA_DESKTOP_AUTO_UPDATE_ENV: deployment, DOWNLOAD_TEST_ORIGIN: 'https://updates.harnova.example', DOWNLOAD_PROD_ORIGIN: 'https://updates.harnova.example' }
    expect(() => resolveDesktopAutoUpdateConfig(inherited, 'win32', 'x64')).toThrow(key)
    for (const origin of ['https://deepseek.com', 'https://download.deepseek.com', 'https://DOWNLOAD.DEEPSEEK.COM']) {
      expect(() => resolveDesktopAutoUpdateConfig({ ...inherited, [key]: origin }, 'win32', 'x64')).toThrow(/DeepSeek/u)
    }
  })

  it('rejects unknown deployments and targets', () => {
    expect(() => resolveDesktopAutoUpdateEnvironment({
      HARNOVA_DESKTOP_AUTO_UPDATE_ENV: 'staging',
    })).toThrow(/test.*production/u)
    expect(() => resolveDesktopAutoUpdateTarget('linux', 'x64')).toThrow(/unsupported target/u)
    expect(() => desktopBuildRecordFilename('linux-x64' as 'mac-arm64')).toThrow(/unsupported target/u)
  })

  it('uses Nightly metadata for stable and prerelease Desktop versions', () => {
    expect(desktopUpdateMetadataFilename('1.2.3', 'darwin')).toBe('nightly-mac.yml')
    expect(desktopUpdateMetadataFilename('1.2.3-alpha.4', 'darwin')).toBe('nightly-mac.yml')
    expect(desktopUpdateMetadataFilename('1.2.3-beta.2', 'win32')).toBe('nightly.yml')
    expect(() => desktopUpdateMetadataFilename('not-semver', 'darwin')).toThrow(/invalid Desktop version/u)
    expect(() => desktopUpdateMetadataFilename('1.2.3', 'linux')).toThrow(/unsupported metadata platform/u)
  })
})
