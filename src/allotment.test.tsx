import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";

import { Allotment } from "./index";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("Allotment", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as any).ResizeObserver ??= ResizeObserverMock;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("double-clicking a sash calls the latest onReset", () => {
    const firstOnReset = jest.fn();
    const secondOnReset = jest.fn();

    const render = (onReset: () => void) =>
      act(() => {
        root.render(
          <Allotment defaultSizes={[100, 100]} onReset={onReset}>
            <div key="a" />
            <div key="b" />
          </Allotment>,
        );
      });

    render(firstOnReset);
    render(secondOnReset);

    const sash = container.querySelector(".sash");
    expect(sash).not.toBeNull();

    act(() => {
      sash!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    expect(firstOnReset).not.toHaveBeenCalled();
    expect(secondOnReset).toHaveBeenCalledTimes(1);
  });

  describe("a pane hidden on mount", () => {
    const WIDTH = 600;

    beforeEach(() => {
      jest
        .spyOn(HTMLElement.prototype, "offsetWidth", "get")
        .mockReturnValue(WIDTH);
      (globalThis as any).ResizeObserver = class {
        constructor(private callback: ResizeObserverCallback) {}
        observe() {
          this.callback(
            [{ contentRect: { width: WIDTH, height: 300 } } as any],
            this as any,
          );
        }
        unobserve() {}
        disconnect() {}
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
      (globalThis as any).ResizeObserver = ResizeObserverMock;
    });

    const render = (
      visible: boolean,
      props: Partial<React.ComponentProps<typeof Allotment>>,
    ) =>
      act(() => {
        root.render(
          <Allotment {...props}>
            <Allotment.Pane key="a" visible={visible}>
              <div />
            </Allotment.Pane>
            <Allotment.Pane key="b">
              <div />
            </Allotment.Pane>
          </Allotment>,
        );
      });

    test.each([
      ["scales defaultSizes", { defaultSizes: [1, 1] }, [300, 300]],
      [
        "keeps pixel defaultSizes without proportionalLayout",
        { defaultSizes: [250, 0], proportionalLayout: false },
        [250, 350],
      ],
    ])("%s when shown", (_, props, shownSizes) => {
      const onChange = jest.fn();

      render(false, { ...props, onChange });
      expect(onChange.mock.calls[0][0]).toEqual([0, WIDTH]);

      render(true, { ...props, onChange });
      expect(onChange).toHaveBeenLastCalledWith(shownSizes);
    });
  });
});
