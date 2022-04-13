import * as React from "react";
import { ModalsState, ModalsStateEntry, ModalType } from "./types";
import { warnOnce } from "../../lib/warnOnce";
import { getNavId } from "../../lib/getNavId";
import { useIsomorphicLayoutEffect } from "../../lib/useIsomorphicLayoutEffect";
import { noop, isFunction } from "../../lib/utils";

interface ModalTransitionState {
  activeModal?: string | null;
  enteringModal?: string | null;
  exitingModal?: string | null;

  history?: string[];
  isBack?: boolean | null;
}

export interface ModalTransitionProps extends ModalTransitionState {
  onEnter: (id: string | null) => void;
  onExit: (id: string | null) => void;
  getModalState: (id: string) => ModalsStateEntry;
  closeActiveModal: VoidFunction;
  delayEnter: boolean;
}

function getModals(children: React.ReactNode | React.ReactNode[]) {
  return React.Children.toArray(children) as React.ReactElement[];
}

const warn = warnOnce("ModalRoot");

export function modalTransitionReducer(
  state: ModalTransitionState,
  action: {
    type: "setActive" | "entered" | "exited" | "inited";
    id: string | null;
  }
): ModalTransitionState {
  if (action.type === "setActive" && action.id !== state.activeModal) {
    const nextModal = action.id;
    // preserve exiting modal if switching mid-transition
    const prevModal = state.exitingModal || state.activeModal;
    let history = state.history ? [...state.history] : [];
    const isBack = Boolean(nextModal && history.includes(nextModal));

    if (nextModal === null) {
      history = [];
    } else if (isBack) {
      history = history.splice(0, history.indexOf(nextModal) + 1);
    } else {
      history.push(nextModal);
    }

    return {
      activeModal: nextModal,
      // not entering yet
      enteringModal: null,
      exitingModal: prevModal,
      history,
      isBack,
    };
  }
  if (action.type === "entered" && action.id === state.enteringModal) {
    return { ...state, enteringModal: null };
  }
  if (action.type === "exited" && action.id === state.exitingModal) {
    return { ...state, exitingModal: null };
  }
  if (action.type === "inited" && action.id === state.activeModal) {
    return { ...state, enteringModal: action.id };
  }
  return state;
}

/**
 * Реализует переход модалок. При смене activeModal m1 -> m2:
 * 1. activeModal: m1, exitingModal: null, enteringModal: null, триггер перехода
 * 2. activeModal: m2, exitingModal: m1, enteringModal: null, рендерим m2 чтобы прошел init, начинаем анимацию выхода
 * одновременный переход между ModalPage:
 *   3a. activeModal: m2, exitingModal: m1, enteringModal: m2
 *   4a. exitingModal и enteringModal переходят в null в порядке завершения анимации
 * ИЛИ дожидаемся скрытия ModalCard
 *   3b. activeModal: m2, exitingModal: null, enteringModal: m2
 *   4b. enteringModal переходит в null после завершения анимации
 * 5. activeModal: m2, exitingModal: null, enteringModal: null, переход закончен
 */
export function useModalManager(
  activeModal: string | null | undefined,
  children: React.ReactNode | React.ReactNode[],
  onOpen: (id: string) => void,
  onClose: (id: string) => void,
  initModal: (state: ModalsStateEntry) => void = noop
): ModalTransitionProps {
  const modalsState = React.useRef<ModalsState>({}).current;
  getModals(children).forEach((Modal) => {
    const modalProps = Modal.props;
    const id = getNavId(modalProps, warn);
    const state: ModalsStateEntry = (id !== undefined && modalsState[id]) || {
      id: id ?? null,
    };

    state.onOpen = Modal.props.onOpen;
    state.onClose = Modal.props.onClose;
    state.dynamicContentHeight = !!modalProps.dynamicContentHeight;
    // ModalPage props
    if (typeof modalProps.settlingHeight === "number") {
      state.settlingHeight = modalProps.settlingHeight;
    }

    if (state.id !== null) {
      modalsState[state.id] = state;
    }
  });

  const isMissing = activeModal && !modalsState[activeModal];
  const safeActiveModal = isMissing ? null : activeModal;
  const [transitionState, dispatchTransition] = React.useReducer(
    modalTransitionReducer,
    {
      activeModal: safeActiveModal,
      enteringModal: null,
      exitingModal: null,
      history: safeActiveModal ? [safeActiveModal] : [],
      isBack: false,
    }
  );

  // Map props to state, render activeModal for init
  useIsomorphicLayoutEffect(() => {
    // ignore non-existent activeModal
    if (process.env.NODE_ENV === "development" && isMissing) {
      warn(`Can't transition - modal ${activeModal} not found`, "error");
    }
    dispatchTransition({ type: "setActive", id: safeActiveModal ?? null });
  }, [activeModal]);

  // Init activeModal & set enteringModal
  useIsomorphicLayoutEffect(() => {
    if (transitionState.activeModal) {
      initModal(modalsState[transitionState.activeModal]);
      dispatchTransition({ type: "inited", id: transitionState.activeModal });
    }
  }, [transitionState.activeModal]);

  const isCard = (id: string | null | undefined) =>
    id != null && modalsState[id]?.type === ModalType.CARD;
  const onEnter = React.useCallback(
    (id: string | null) => {
      if (id) {
        const modalState = modalsState[id];

        if (isFunction(modalState.onOpen)) {
          modalState.onOpen();
        } else if (isFunction(onOpen)) {
          onOpen(id);
        }
      }

      dispatchTransition({ type: "entered", id });
    },
    [modalsState, onOpen]
  );
  const onExit = React.useCallback(
    (id: string | null) => dispatchTransition({ type: "exited", id }),
    []
  );
  const delayEnter = Boolean(
    transitionState.exitingModal &&
      (isCard(activeModal) || isCard(transitionState.exitingModal))
  );
  const getModalState = React.useCallback(
    (id: string) => modalsState[id],
    [modalsState]
  );

  function closeActiveModal() {
    const modalState =
      transitionState.activeModal && modalsState[transitionState.activeModal];
    if (modalState) {
      if (isFunction(modalState.onClose)) {
        modalState.onClose();
      } else if (isFunction(onClose)) {
        onClose(modalState.id);
      } else if (process.env.NODE_ENV === "development") {
        warn("onClose is undefined", "error");
      }
    }
  }

  return {
    onEnter,
    onExit,
    ...transitionState,
    delayEnter,
    getModalState,
    closeActiveModal,
  };
}

export function withModalManager(
  initModal: (a: ModalsStateEntry) => void = noop
) {
  return function <Props extends ModalTransitionProps>(
    Wrapped: React.ComponentType<Props>
  ): React.FC<
    Omit<Props, keyof ModalTransitionProps> & { activeModal?: string | null }
  > {
    return function WithModalManager(props) {
      const transitionManager = useModalManager(
        props.activeModal,
        props.children,
        (props as any).onOpen,
        (props as any).onClose,
        initModal
      );
      return <Wrapped {...(props as any)} {...transitionManager} />;
    };
  };
}
