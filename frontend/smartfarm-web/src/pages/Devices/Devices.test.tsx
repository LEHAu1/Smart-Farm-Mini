// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

describe('Add Device form', () => {
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
    await user.type(codeInput, 'FARM ESP32!');
    await user.type(screen.getByPlaceholderText('Ví dụ: Chậu hoa hồng ban công'), 'Vườn mini');

    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(await screen.findByText(/Mã thiết bị chỉ được chứa/)).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });
});
