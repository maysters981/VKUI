import * as React from 'react';
import { classNames } from '@vkontakte/vkjs';
import { clamp } from '../../helpers/math';
import { HasRootRef } from '../../types';
import styles from './Progress.module.css';

function progressCustomHeightStyle(height: number | undefined): React.CSSProperties | undefined {
  return height
    ? {
        height,
        borderRadius: height / 2,
      }
    : undefined;
}

function progressStyle(height: number | undefined, styleProps: React.CSSProperties | undefined) {
  const styleHeight = progressCustomHeightStyle(height);
  const style = styleHeight ? { ...styleProps, ...styleHeight } : styleProps;

  return style;
}

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    HasRootRef<HTMLDivElement> {
  /**
   * Стиль отображения прогрессбара
   */
  appearance?: 'accent' | 'positive' | 'negative';
  value?: number;
  /**
   * Высота элемента.
   */
  height?: number;
}

const PROGRESS_MIN_VALUE = 0;
const PROGRESS_MAX_VALUE = 100;

/**
 * @see https://vkcom.github.io/VKUI/#/Progress
 */
export const Progress = ({
  value = 0,
  getRootRef,
  className,
  appearance = 'accent',
  height,
  style: styleProps,
  ...restProps
}: ProgressProps) => {
  const progress = clamp(value, PROGRESS_MIN_VALUE, PROGRESS_MAX_VALUE);
  const title = `${progress} / ${PROGRESS_MAX_VALUE}`;

  const style = progressStyle(height, styleProps);

  return (
    <div
      aria-valuenow={value}
      title={title}
      style={style}
      {...restProps}
      role="progressbar"
      aria-valuemin={PROGRESS_MIN_VALUE}
      aria-valuemax={PROGRESS_MAX_VALUE}
      ref={getRootRef}
      className={classNames(
        styles['Progress'],
        {
          accent: styles['Progress--appearance-accent'],
          positive: styles['Progress--appearance-positive'],
          negative: styles['Progress--appearance-negative'],
        }[appearance],
        className,
      )}
    >
      <div className={styles['Progress__in']} style={{ width: `${progress}%` }} />
    </div>
  );
};
