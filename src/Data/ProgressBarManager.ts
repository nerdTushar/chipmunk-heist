export class ProgressBarManager {
    private static fillElement: HTMLElement | null = null;
    private static _current: number = 0;
    private static _target: number = 0;
    private static _rafId: number = 0;

    static show() {
        const container = document.getElementById('GameDiv');
        if (!container) {
            console.error('ProgressBarManager: GameDiv container not found');
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.id = 'loading-progress-wrapper';
        wrapper.style.cssText = [
            'position:absolute',
            'bottom:20%',
            'left:50%',
            'transform:translateX(-50%)',
            'width:60%',
            'height:8px',
            'background:rgba(0, 0, 0, 0.2)',
            'border-radius:5px',
            'overflow:hidden',
            'z-index:9999',
        ].join(';');

        const fill = document.createElement('div');
        fill.style.cssText = [
            'width:0%',
            'height:100%',
            'background:linear-gradient(90deg,#ffffff,#007bff)',
            'border-radius:5px',
        ].join(';');

        wrapper.appendChild(fill);
        container.appendChild(wrapper);

        ProgressBarManager.fillElement = fill;
        ProgressBarManager._current = 0;
        ProgressBarManager._target = 0;
        ProgressBarManager._tick();
    }

    static setTargetProgress(value: number) {
        // Never go backwards
        ProgressBarManager._target = Math.max(ProgressBarManager._target, Math.min(value, 1));
    }

    static hide() {
        cancelAnimationFrame(ProgressBarManager._rafId);
        ProgressBarManager._rafId = 0;

        const wrapper = document.getElementById('loading-progress-wrapper');
        if (wrapper && wrapper.parentElement) {
            wrapper.parentElement.removeChild(wrapper);
        }
        ProgressBarManager.fillElement = null;
        ProgressBarManager._current = 0;
        ProgressBarManager._target = 0;
    }

    private static _tick() {
        ProgressBarManager._current += (ProgressBarManager._target - ProgressBarManager._current) * 0.1;

        if (ProgressBarManager.fillElement) {
            ProgressBarManager.fillElement.style.width = `${(ProgressBarManager._current * 100).toFixed(2)}%`;
        }

        ProgressBarManager._rafId = requestAnimationFrame(() => ProgressBarManager._tick());
    }
}