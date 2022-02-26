import { BoundingBox, Location, Size } from "@andrewthehan/math";
import Portal, { HTMLPortalElement } from "@andrewthehan/portal";
import {
  useBox,
  useHover,
  useSize,
  useWindowSize,
} from "@andrewthehan/ui-hooks";
import React, {
  Dispatch,
  ReactNode,
  Ref,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const OFF_SCREEN = Location.of(-1e5, -1e5);

const DEFAULT_MARGIN = 16;

export type TooltipConfig = {
  margin?: number;

  showOnHover?: boolean;
  hideOnNoHover?: boolean;
};

export default function useTooltip<T extends HTMLElement>(
  contentProvider: () => ReactNode,
  {
    margin = DEFAULT_MARGIN,
    showOnHover = true,
    hideOnNoHover = true,
  }: TooltipConfig
): [Ref<T>, ReactNode, Dispatch<SetStateAction<boolean>>, boolean] {
  const [hoverRef, isHover] = useHover<T>();
  const windowSize = useWindowSize();
  const [triggerRef, triggerBox] = useBox<T>();
  const [tooltipRef, tooltipSize] = useSize<HTMLPortalElement>();

  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    if (showOnHover && isHover) {
      setVisible(true);
      return;
    }

    if (hideOnNoHover && !isHover) {
      setVisible(false);
      return;
    }
  }, [showOnHover, hideOnNoHover, isHover]);

  const ref = useCallback(
    (ref: T) => {
      hoverRef(ref);
      triggerRef(ref);
    },
    [hoverRef, triggerRef]
  );

  const content = useMemo(() => contentProvider(), [contentProvider]);

  const tooltipOrigin = useMemo(() => {
    if (Size.equals(tooltipSize, Size.of(0, 0))) {
      return OFF_SCREEN;
    }

    return getContentOrigin(triggerBox, tooltipSize, windowSize, margin);
  }, [triggerBox, tooltipSize, windowSize]);

  const portal = useMemo(() => {
    if (!isVisible) {
      return <></>;
    }
    return (
      <Portal
        ref={tooltipRef}
        style={{
          zIndex: 99,
          position: "fixed",
          top: tooltipOrigin.y,
          left: tooltipOrigin.x,
        }}
      >
        {content}
      </Portal>
    );
  }, [tooltipRef, isVisible, content, tooltipOrigin]);

  const tooltip = useMemo(
    () => (isVisible ? portal : <></>),
    [isVisible, portal]
  );

  return [ref, tooltip, setVisible, isVisible];
}

function isContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return (
    isVerticallyContained(box, viewportSize, margin) &&
    isHorizontallyContained(box, viewportSize, margin)
  );
}

function isTopContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return 0 <= box.top - margin;
}

function isBottomContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return box.bottom + margin < viewportSize.height;
}

function isVerticallyContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return (
    isTopContained(box, viewportSize, margin) &&
    isBottomContained(box, viewportSize, margin)
  );
}
function isLeftContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return 0 <= box.left - margin;
}

function isRightContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return box.right + margin < viewportSize.width;
}

function isHorizontallyContained(
  box: BoundingBox,
  viewportSize: Size,
  margin: number
): boolean {
  return (
    isLeftContained(box, viewportSize, margin) &&
    isRightContained(box, viewportSize, margin)
  );
}

export function getContentOrigin(
  triggerBox: BoundingBox,
  contentSize: Size,
  viewportSize: Size,
  margin: number
): Location {
  const topLocation = Location.of(
    triggerBox.center.x - contentSize.width / 2,
    triggerBox.top - contentSize.height - margin
  );
  const topBox = new BoundingBox(topLocation, contentSize);
  if (isContained(topBox, viewportSize, margin)) {
    return topLocation;
  }

  const rightLocation = Location.of(
    triggerBox.right + margin,
    triggerBox.center.y - contentSize.height / 2
  );
  const rightBox = new BoundingBox(rightLocation, contentSize);
  if (isContained(rightBox, viewportSize, margin)) {
    return rightLocation;
  }

  const leftLocation = Location.of(
    triggerBox.left - contentSize.width - margin,
    triggerBox.center.y - contentSize.height / 2
  );
  const leftBox = new BoundingBox(leftLocation, contentSize);
  if (isContained(leftBox, viewportSize, margin)) {
    return leftLocation;
  }

  const bottomLocation = Location.of(
    triggerBox.center.x - contentSize.width / 2,
    triggerBox.bottom + margin
  );
  const bottomBox = new BoundingBox(bottomLocation, contentSize);
  if (isContained(bottomBox, viewportSize, margin)) {
    return bottomLocation;
  }

  if (isTopContained(topBox, viewportSize, margin)) {
    if (!isLeftContained(topBox, viewportSize, margin)) {
      return topLocation.add(Location.of(-topBox.left + margin, 0));
    }
    if (!isRightContained(topBox, viewportSize, margin)) {
      return topLocation.add(
        Location.of(-(topBox.right - viewportSize.width) + margin, 0)
      );
    }
  }

  if (isBottomContained(bottomBox, viewportSize, margin)) {
    if (!isLeftContained(bottomBox, viewportSize, margin)) {
      return bottomLocation.add(Location.of(-bottomBox.left + margin, 0));
    }
    if (!isRightContained(bottomBox, viewportSize, margin)) {
      return bottomLocation.add(
        Location.of(-(bottomBox.right - viewportSize.width) + margin, 0)
      );
    }
  }

  if (isLeftContained(leftBox, viewportSize, margin)) {
    if (!isTopContained(leftBox, viewportSize, margin)) {
      return leftLocation.add(Location.of(0, -leftBox.top + margin));
    }
    if (!isBottomContained(leftBox, viewportSize, margin)) {
      return leftLocation.add(
        Location.of(0, -(leftBox.bottom - viewportSize.height) + margin)
      );
    }
  }

  if (isRightContained(rightBox, viewportSize, margin)) {
    if (!isTopContained(rightBox, viewportSize, margin)) {
      return rightLocation.add(Location.of(0, -rightBox.top + margin));
    }
    if (!isBottomContained(rightBox, viewportSize, margin)) {
      return rightLocation.add(
        Location.of(0, -(rightBox.bottom - viewportSize.height) + margin)
      );
    }
  }

  throw new Error(
    `Viewport size ${viewportSize} is too small to contain the content ${contentSize}.`
  );
}
