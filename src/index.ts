import { useMemo, useReducer } from 'react';


//
// INTERNAL
//


interface DispatchProps<TMsg, TProps> {
  args:   any[];
  msg:    TMsg;
  props:  TProps;
}

type WillTriggerUpdate = void;


//
// EXPORTS
//


/**
 * Commands are primarily called in the `view` function to trigger an `update`.
 *
 * Commands can also be called in the `update` function with caution, as to avoid an infinite loop.
 * This can be useful when dealing with`Promises`.
 */
export type Cmd<TMsg extends string> = Record<TMsg, (...args: any[]) => WillTriggerUpdate>;

/**
 * Similar to Elm, `Maybe<T>` represents either `T` or "nothing" (`undefined`).
 * Unlike Elm, it may also represent a `Partial<T>`.
 * The return type of the `update` function is actually `Maybe<Model>`,
 * which makes it possible for the `update` function to return partial states.
 */
export type Maybe<T> = T | Partial<T> | undefined | void;

export interface Init<TMsg extends string, TProps> {
  cmd:    Cmd<TMsg>;
  props:  TProps;
}

export interface Update<TModel, TMsg extends string, TProps> {
  args:   any[];
  cmd:    Cmd<TMsg>;
  model:  TModel;
  msg:    TMsg;
  props:  TProps;
}

export interface AfterUpdate<TModel, TMsg extends string, TProps> {
  cmd:    Cmd<TMsg>;
  model:  TModel;
  props:  TProps;
}

export interface View<TModel, TMsg extends string, TProps, TSubs> {
  cmd:    Cmd<TMsg>;
  model:  TModel;
  props:  TProps;
  subs:   TSubs;
}

export interface RealmConfig<TModel, TMsg extends string, TProps, TSubs> {
  init:         (params: Init<TMsg, TProps>) => TModel;
  update:       (params: Update<TModel, TMsg, TProps>) => Maybe<TModel>;
  afterUpdate?: (params: AfterUpdate<TModel, TMsg, TProps>) => Maybe<TModel>;
  view:         (params: View<TModel, TMsg, TProps, TSubs>) => JSX.Element;
  props:        TProps;
  subs:         TSubs;
}

export function useRealm<TModel, TMsg extends string, TProps, TSubs>(config: RealmConfig<TModel, TMsg, TProps, TSubs>) {
  const {init, update, afterUpdate, view, props, subs} = config;

  const cmd = useMemo(() => {
    return new Proxy({} as Cmd<TMsg>, {
      get(_, prop) {
        return (...args: any[]): WillTriggerUpdate => {
          dispatch({ args, msg: prop.toString() as TMsg, props });
        };
      }
    });
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

  return view({cmd, model, props, subs});
}

/**
 * An immutable list implementation to help with mutating the state when using reducers, such as `useRealm`.
 * It's too easy to mess up updating the state when using the `useReducer` hook (that `useRealm` depends on),
 * especially when dealing with lists of objects.
 *
 * What makes this class special is that it's guaranteed that not a single method will update the object in place,
 * but will return a new immutable list instance or item.
 * This makes it an ideal use case in `realm` components.
 * It provides some useful methods for adding, updating and removing list items.
 */
export class ImmutableList<T> {

  private readonly _array: T[];

  constructor(array?: T[]) {
    this._array = array ? [...array] : [];
  }

  get array() {
    return [...this._array];
  }

  get length() {
    return this._array.length;
  }

  append(item: T) {
    return new ImmutableList([...this._array, item]);
  }

  prepend(item: T) {
    return new ImmutableList([item, ...this._array]);
  }

  insertAt(index: number, item: T) {
    return new ImmutableList([...this._array.slice(0, index), item, ...this._array.slice(index)]);
  }

  at(index: number) {
    return this._array[index];
  }

  pop(start = false) {
    const index = start ? 0 : this._array.length - 1;
    return this.removeAt(index);
  }

  /**
   * Remove or update a list item.
   *
   * If the `shouldRemove` returns a truthy value, the item will be removed.
   * If it returns a falsy value, the item will be updated using the `updateInstead` function.
   * @param index
   * @param shouldRemove Checks if the item should be removed.
   * @param updateInstead Returns an updated list item.
   * @returns A new `ImmutableList` instance.
   */
  mutateAt(index: number, shouldRemove: (item: T) => boolean, updateInstead: (item: T) => Maybe<T>) {
    if (shouldRemove(this._array[index])) {
      return this.removeAt(index);
    } else {
      const maybeItem: Maybe<T> = updateInstead(this._array[index]);
      if (maybeItem instanceof Object) {
        const item: T = {...this._array[index], ...maybeItem};
        return this.updateAt(index, item);
      } else {
        return this.updateAt(index, maybeItem as T);
      }
    }
  }

  removeAt(index: number) {
    return new ImmutableList(this._array.filter((_, i) => i !== index));
  }

  updateAt(index: number, newItem: T) {
    return new ImmutableList(this._array.map((item, i) => i === index ? newItem : item));
  }

  filter(predicate: (item: T, index: number, array: T[]) => boolean) {
    return new ImmutableList(this._array.filter(predicate));
  }

  map(callbackfn: (item: T, index: number, array: T[]) => any) {
    return new ImmutableList(this._array.map(callbackfn));
  }

  toString() {
    return JSON.stringify(this._array);
  }

  *[Symbol.iterator]() {
    for (const item of this._array) {
      yield item;
    }
  }

}

export class ImmutableObject<T extends object> {

  private readonly _object: T;

  constructor(object: T) {
    this._object = {...object};
  }

  get object() {
    return { ...this._object };
  }

  update(fields: Partial<{[key in keyof T]: typeof this._object[key]}>) {
    return new ImmutableObject<T>({ ...this._object, ...fields });
  }

}
