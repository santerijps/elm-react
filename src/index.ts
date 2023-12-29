import { useMemo, useReducer } from 'react';


//
// INTERNAL
//


type CmdFunction = {
  (...args: any[]): void;
  curry: (...bindArgs: any[]) => (...args: any[]) => void;
};

type DispatchProps<TMsg, TProps> = {
  args:   any[];
  msg:    TMsg;
  props:  TProps;
};


//
// EXPORTS
//


/**
 * Commands are primarily called in the `view` function to trigger an `update`.
 *
 * Commands can also be called in the `update` function with caution, as to avoid an infinite loop.
 * This can be useful when dealing with`Promises`.
 */
export type Cmd<TMsg extends string> = Record<TMsg, CmdFunction>;

/**
 * Similar to Elm, `Maybe<T>` represents either `T` or "nothing" (`undefined`).
 * Unlike Elm, it may also represent a `Partial<T>`.
 * The return type of the `update` function is actually `Maybe<Model>`,
 * which makes it possible for the `update` function to return partial states.
 */
export type Maybe<T> = T | Partial<T> | undefined | void;

export type Init<TMsg extends string, TProps = unknown> = {
  cmd:    Cmd<TMsg>;
  props:  TProps;
};

export type Update<TModel, TMsg extends string, TProps = unknown> = {
  args:   any[];
  cmd:    Cmd<TMsg>;
  model:  TModel;
  msg:    TMsg;
  props:  TProps;
};

export type AfterUpdate<TModel, TMsg extends string, TProps = unknown> = {
  cmd:    Cmd<TMsg>;
  model:  TModel;
  props:  TProps;
};

export type View<TModel, TMsg extends string, TProps = unknown> = {
  cmd:    Cmd<TMsg>;
  model:  TModel;
  props:  TProps;
};

export type ElmConfig<TModel, TMsg extends string, TProps = unknown> = {
  init:         (params: Init<TMsg, TProps>) => TModel;
  update:       (params: Update<TModel, TMsg, TProps>) => Maybe<TModel>;
  afterUpdate?: (params: AfterUpdate<TModel, TMsg, TProps>) => Maybe<TModel>;
  view:         (params: View<TModel, TMsg, TProps>) => JSX.Element;
  props?:       TProps;
};

export function useElm<TModel, TMsg extends string, TProps  = unknown>(config: ElmConfig<TModel, TMsg, TProps>) {
  const {init, update, afterUpdate, view} = config;
  const props = config.props as TProps;

  const cmd = useMemo(() => {
    return new Proxy({}, {
      get(_target, prop) {
        const msg = prop.toString() as TMsg;
        const cmd = (...args: any[]) => dispatch({args, msg, props});
        cmd.curry = (...bindArgs: any[]) => (...args: any[]) => dispatch({args: [...bindArgs, ...args], msg, props});
        return cmd;
      }
    }) as Cmd<TMsg>;
  }, [props]);

  const initialModel = useMemo(() => init({cmd, props}), [props]);
  const reducer = useMemo(() => initialModel instanceof Object ? objectReducer : primitiveReducer, [initialModel]);
  const [model, dispatch] = useReducer(reducer, initialModel);

  function objectReducer(model: TModel, {args, msg, props}: DispatchProps<TMsg, TProps>): TModel {
    const partialModel: Maybe<TModel> = update({args, cmd, model, msg, props});
    const updatedModel: TModel = {...model, ...(partialModel instanceof Object && partialModel)};
    if (afterUpdate) {
      const partialModel: Maybe<TModel> = afterUpdate({cmd, model: updatedModel, props});
      return {...updatedModel, ...(partialModel instanceof Object && partialModel)};
    } else {
      return updatedModel;
    }
  }

  function primitiveReducer(model: TModel, {args, msg, props}: DispatchProps<TMsg, TProps>): TModel {
    const updatedModel: TModel = update({args, cmd, model, msg, props}) as TModel;
    if (afterUpdate) {
      return afterUpdate({cmd, model: updatedModel, props}) as TModel;
    } else {
      return updatedModel;
    }
  }

  return view({cmd, model, props});
}
