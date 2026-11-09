import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapEcModeToProfile,
  formatFanSpeedSysfs,
  parseFanSpeedSysfs,
  calculateRpmFromPercent,
  interpolateFanCurve,
  getThermalStatus,
  FAN_CURVE_PRESETS,
  ANV15_SPECS,
} from './fanMath';

test('mapEcModeToProfile correctly maps ANV15 EC modes', () => {
  assert.equal(mapEcModeToProfile(0), 'turbo');
  assert.equal(mapEcModeToProfile(1), 'performance');
  assert.equal(mapEcModeToProfile(2), 'balanced');
  assert.equal(mapEcModeToProfile(3), 'quiet');
  assert.equal(mapEcModeToProfile(4), 'eco');
  assert.equal(mapEcModeToProfile(99), 'balanced'); // fallback
});

test('formatFanSpeedSysfs formats valid comma-separated cpu,gpu string', () => {
  assert.equal(formatFanSpeedSysfs(0, 0), '0,0');
  assert.equal(formatFanSpeedSysfs(100, 100), '100,100');
  assert.equal(formatFanSpeedSysfs(45, 65), '45,65');
  // Clamping
  assert.equal(formatFanSpeedSysfs(-10, 150), '0,100');
  assert.equal(formatFanSpeedSysfs(NaN, 50), '0,50');
});

test('parseFanSpeedSysfs parses raw sysfs strings properly', () => {
  assert.deepEqual(parseFanSpeedSysfs('0,0'), { cpu: 0, gpu: 0 });
  assert.deepEqual(parseFanSpeedSysfs('50,75\n'), { cpu: 50, gpu: 75 });
  assert.deepEqual(parseFanSpeedSysfs('100,100'), { cpu: 100, gpu: 100 });
  assert.deepEqual(parseFanSpeedSysfs('invalid'), { cpu: 0, gpu: 0 });
});

test('calculateRpmFromPercent computes expected RPM range for ANV15-52', () => {
  assert.equal(calculateRpmFromPercent(0, 'cpu'), 0);
  assert.equal(calculateRpmFromPercent(0, 'gpu'), 0);
  
  // 100% speed must hit max specs
  assert.equal(calculateRpmFromPercent(100, 'cpu'), ANV15_SPECS.maxCpuRpm);
  assert.equal(calculateRpmFromPercent(100, 'gpu'), ANV15_SPECS.maxGpuRpm);
  
  // 50% speed should be between idle and max
  const cpuMid = calculateRpmFromPercent(50, 'cpu');
  assert.ok(cpuMid > 1800 && cpuMid < ANV15_SPECS.maxCpuRpm);
});

test('interpolateFanCurve smoothly interpolates speeds across temperature points', () => {
  const curve = [
    { temp: 40, speed: 20 },
    { temp: 60, speed: 50 },
    { temp: 80, speed: 100 },
  ];

  // At or below lowest temp
  assert.equal(interpolateFanCurve(30, curve), 20);
  assert.equal(interpolateFanCurve(40, curve), 20);

  // Exact midpoint (50°C is halfway between 40 and 60 -> halfway between 20% and 50% = 35%)
  assert.equal(interpolateFanCurve(50, curve), 35);

  // Exact point
  assert.equal(interpolateFanCurve(60, curve), 50);

  // 70°C is halfway between 60 and 80 -> halfway between 50% and 100% = 75%
  assert.equal(interpolateFanCurve(70, curve), 75);

  // At or above highest temp
  assert.equal(interpolateFanCurve(80, curve), 100);
  assert.equal(interpolateFanCurve(95, curve), 100);
});

test('getThermalStatus returns correct status labels and colors', () => {
  assert.equal(getThermalStatus(42).status, 'cool');
  assert.equal(getThermalStatus(62).status, 'normal');
  assert.equal(getThermalStatus(76).status, 'warm');
  assert.equal(getThermalStatus(87).status, 'hot');
  assert.equal(getThermalStatus(95).status, 'critical');
});

test('preset curves have valid ascending temperature thresholds', () => {
  for (const [key, preset] of Object.entries(FAN_CURVE_PRESETS)) {
    assert.ok(preset.length >= 3, `${key} has at least 3 points`);
    for (let i = 0; i < preset.length - 1; i++) {
      assert.ok(preset[i].temp < preset[i + 1].temp, `${key} temps are strictly increasing`);
      assert.ok(preset[i].speed <= preset[i + 1].speed, `${key} speeds are non-decreasing`);
    }
  }
});
