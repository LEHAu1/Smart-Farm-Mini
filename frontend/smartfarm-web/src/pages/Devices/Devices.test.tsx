// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DevicesPage from './index';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../../services/api-client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../hooks/useSensorHub', () => ({
  useSensorHub: () => ({ onDeviceStatus: () => () => undefined }),
}));

afterEach(cleanup);

beforeEach(() => {
  getMock.mockReset().mockResolvedValue({ data: { items: [] } });
  postMock.mockReset();
});

function renderDevices() {
  render(
    <MemoryRouter>
      <DevicesPage />
    </MemoryRouter>
  );
}

describe('Device list loading', () => {
  it('shows a load error instead of the empty state and retries successfully', async () => {
    const device = {
      id: 'device-1',
      ownerId: 'user-1',
      deviceCode: 'FARM-ESP32-001',
      name: 'Vườn mini',
      description: null,
      isOnline: false,
      isActive: true,
      createdAtUtc: '2026-11-23T00:00:00Z',
      updatedAtUtc: '2026-11-23T00:00:00Z',
      lastSeenAtUtc: null,
    };
    getMock
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ data: { items: [device] } });
    renderDevices();
    const user = userEvent.setup();

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể tải danh sách thiết bị.');
    expect(screen.queryByText('Chưa có thiết bị nào được đăng ký')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByText(device.deviceCode)).toBeTruthy();
    expect(screen.getByText(device.name)).toBeTruthy();
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});

describe('Add Device form', () => {
  it('shows required-field feedback for an empty form without calling the API', async () => {
    renderDevices();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị mới' }));
    const form = screen.getByRole('button', { name: 'Đăng ký' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText('Vui lòng nhập mã thiết bị.')).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only required values with visible feedback and no API call', async () => {
    renderDevices();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị mới' }));
    await user.type(screen.getByPlaceholderText('Ví dụ: SF-NODE-01'), 'FARM-ESP32-001');
    await user.type(screen.getByPlaceholderText('Ví dụ: Chậu hoa hồng ban công'), '   ');
    const form = screen.getByRole('button', { name: 'Đăng ký' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText('Vui lòng nhập tên thiết bị.')).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only Device Code with visible feedback and no API call', async () => {
    renderDevices();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị mới' }));
    await user.type(screen.getByPlaceholderText('Ví dụ: SF-NODE-01'), '   ');
    await user.type(screen.getByPlaceholderText('Ví dụ: Chậu hoa hồng ban công'), 'Vườn mini');
    const form = screen.getByRole('button', { name: 'Đăng ký' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText('Vui lòng nhập mã thiết bị.')).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('creates a valid device and adds it to the visible list', async () => {
    const createdDevice = {
      id: 'device-1',
      ownerId: 'user-1',
      deviceCode: 'FARM-ESP32-003',
      name: 'Vườn thử nghiệm',
      description: null,
      isOnline: false,
      isActive: true,
      createdAtUtc: '2026-11-23T00:00:00Z',
      updatedAtUtc: '2026-11-23T00:00:00Z',
      lastSeenAtUtc: null,
    };
    postMock.mockResolvedValue({ data: createdDevice });
    renderDevices();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị mới' }));
    await user.type(screen.getByPlaceholderText('Ví dụ: SF-NODE-01'), createdDevice.deviceCode);
    await user.type(screen.getByPlaceholderText('Ví dụ: Chậu hoa hồng ban công'), createdDevice.name);
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(await screen.findByText('Đăng ký thiết bị thành công!')).toBeTruthy();
    expect(screen.getByText(createdDevice.deviceCode)).toBeTruthy();
    expect(screen.getByText(createdDevice.name)).toBeTruthy();
    expect(postMock).toHaveBeenCalledWith('/api/devices', {
      deviceCode: createdDevice.deviceCode,
      name: createdDevice.name,
      description: undefined,
    });
  });

  it('shows the duplicate-code message returned by a 400 response without exposing details', async () => {
    const duplicateMessage = "Thiết bị với mã 'FARM-ESP32-001' đã tồn tại trong hệ thống.";
    postMock.mockRejectedValue({
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          error: duplicateMessage,
          details: 'Internal stack trace must not be shown',
        },
      },
    });
    renderDevices();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị mới' }));
    await user.type(screen.getByPlaceholderText('Ví dụ: SF-NODE-01'), 'FARM-ESP32-001');
    await user.type(screen.getByPlaceholderText('Ví dụ: Chậu hoa hồng ban công'), 'Vườn mini');
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(await screen.findByText(duplicateMessage)).toBeTruthy();
    expect(screen.queryByText('Request failed with status code 400')).toBeNull();
    expect(screen.queryByText('Internal stack trace must not be shown')).toBeNull();
    expect(postMock).toHaveBeenCalledWith('/api/devices', {
      deviceCode: 'FARM-ESP32-001',
      name: 'Vườn mini',
      description: undefined,
    });
  });

  it('rejects a Device Code outside the firmware-safe pattern without calling the API', async () => {
    renderDevices();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị mới' }));
    const codeInput = screen.getByPlaceholderText('Ví dụ: SF-NODE-01') as HTMLInputElement;
    const deviceCodePattern = new RegExp(`^(?:${codeInput.pattern})$`, 'v');
    expect(deviceCodePattern.test('SF-NODE-01')).toBe(true);
    expect(deviceCodePattern.test('FARM ESP32!')).toBe(false);
    await user.type(codeInput, 'FARM ESP32!');
    await user.type(screen.getByPlaceholderText('Ví dụ: Chậu hoa hồng ban công'), 'Vườn mini');

    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(await screen.findByText(/Mã thiết bị chỉ được chứa/)).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });
});
