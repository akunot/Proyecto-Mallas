import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DataTable from '../components/DataTable';

const columns = [{ key: 'nombre', label: 'Nombre' }];
const data = [{ id: 1, nombre: 'Uno' }];
const meta = (current_page: number) => ({ current_page, total: 60, per_page: 20, last_page: 3 });

describe('DataTable — paginación', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('al cambiar de página no vuelve a la página 1 tras re-renderizar', () => {
        const onSearch = vi.fn();
        const { rerender } = render(
            <DataTable columns={columns} data={data} meta={meta(1)} onSearch={(s, p) => onSearch(s, p)} />,
        );

        fireEvent.click(screen.getByRole('button', { name: '2' }));
        expect(onSearch).toHaveBeenLastCalledWith('', 2);

        // La página llega con un onSearch nuevo (función inline en cada render)
        rerender(
            <DataTable columns={columns} data={data} meta={meta(2)} onSearch={(s, p) => onSearch(s, p)} />,
        );
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('escribir en el buscador busca desde la página 1', () => {
        const onSearch = vi.fn();
        render(<DataTable columns={columns} data={data} meta={meta(2)} onSearch={onSearch} />);

        fireEvent.change(screen.getByPlaceholderText('Buscar en la tabla...'), { target: { value: 'cal' } });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(onSearch).toHaveBeenCalledExactlyOnceWith('cal', 1);
    });
});
