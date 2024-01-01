import { Maybe } from './index';

// Use this in a switch-case (`case 'whatever': return resolveArgs(args, ...)`)
export function resolveArgs<T>(args: any[], handler: (...args: any[]) => Maybe<T>): Maybe<T> {
  return handler(...args);
}

// Use this insetad of a switch-case
export function matchMsg<TModel, TMsg extends string>(msg: TMsg, args: any[], handlers: Partial<Record<TMsg, (...args: any) => Maybe<TModel>>>): Maybe<TModel> {
  const handler = handlers[msg];
  if (handler) {
    return handler(...args);
  }
}

/**
 * An immutable list implementation to help with mutating the state when using reducers, such as `useElm`.
 * It's too easy to mess up updating the state when using the `useReducer` hook (that `useElm` depends on),
 * especially when dealing with lists of objects.
 *
 * What makes this class special is that it's guaranteed that not a single method will update the object in place,
 * but will return a new immutable list instance or item.
 * This makes it an ideal use case in `elm` components.
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

  updateAt(index: number, partialItem: Maybe<T>) {
    if (this._array[index] instanceof Object) {
      const newItem: T = {...this.array[index], ...(partialItem instanceof Object ? partialItem : {})};
      return new ImmutableList(this._array.map((item, i) => i === index ? newItem : item));
    } else {
      return new ImmutableList(this._array.map((item, i) => i === index ? partialItem as T : item));
    }
  }

  filter(predicate: (item: T, index: number, array: T[]) => boolean) {
    return new ImmutableList(this._array.filter(predicate));
  }

  map<U>(callbackfn: (item: T, index: number, array: T[]) => U) {
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
