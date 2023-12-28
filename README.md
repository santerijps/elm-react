# elm-react

`elm-react` is an attempt to introduce an Elm -like feel when developing React apps.
This is achieved with a custom hook (`useelm-react`) that utilizes React's `useReducer` to smoothly update the state when needed.

`elm-react` reintroduces some of the terminology found in Elm, so in your components you'll

- Define your own `Model` type to represent the component state
- Define your own component messages with the `Msg` type
- Use the `Cmd<T>` type when you want to mutate your state and re-render your view
- Implement the `init`, `update` and `view` functions

Check out [the official Elm documentation](https://guide.elm-lang.org/architecture/) to get a better idea of how Elm architecture plays out.

## Install

```sh
npm i @santerijps/elm-react
```

## Example usage

Compare the example below to [the example found in Elm's documentation](https://guide.elm-lang.org/architecture/buttons) to see how similar they look.

*Disclaimer: The below example is trying to mimic the exact look of Elm. In real usage, you would most likely implement it differently ;)*

```tsx
import { Update, View, useElm } from "@santerijps/elm-react";



// MAIN


export default function Counter() {
  return useElm({ init, update, view });
}



// MODEL


type Model = number;


const init = () =>
  0



// UPDATE


type Msg = 'Increment' | 'Decrement'


const update = ({ msg, model }: Update<Model, Msg>) =>
  ( msg == 'Increment' ? model + 1
  : msg == 'Decrement' ? model - 1
  : model
  )



// VIEW


const view = ({ cmd, model }: View<Model, Msg>) =>
  <div>
    <button onClick={cmd.Decrement}>{'-'}</button>
    <div>{model}</div>
    <button onClick={cmd.Increment}>{'+'}</button>
  </div>

```

### Example: todo-app

```tsx
import {  Maybe, Update, View, useElm } from "@santerijps/elm-react";
import { ImmutableList } from "@santerijps/elm-react/helpers";

export default function Todo() {
  return useElm({ init, update, view });
}

type Item = {
  done: boolean;
  text: string;
};

type Model = {
  items: ImmutableList<Item>;
  input: string;
};

type Msg
  = 'UpdateInput'
  | 'AddItem'
  | 'MarkItemAsDone'
  | 'RemoveItem'

function init(): Model {
  return {
    items: new ImmutableList,
    input: '',
  };
}

function update({ args, model, msg }: Update<Model, Msg>): Maybe<Model> {
  switch (msg) {

    case 'UpdateInput': {
      const [ event ] = args as [Event];
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      return { input: input.value };
    }

    case 'AddItem': {
      const [ event ] = args as [Event];
      event.preventDefault();
      if (model.input.length > 0) {
        return {
          input: '',
          items: model.items.append({text: model.input, done: false})
        };
      }
      break;
    }

    case 'MarkItemAsDone': {
      const [ index ] = args as [number];
      return { items: model.items.updateAt(index, {done: true}) };
    }

    case 'RemoveItem': {
      const [ index ] = args as [number];
      return { items: model.items.removeAt(index) };
    }

  }
}

function view({ cmd, model }: View<Model, Msg>) {
  return (
    <main>
      <form onSubmit={cmd.AddItem}>
        <input type="text" placeholder="Press 'Enter' to add a new item" value={model.input} onInput={cmd.UpdateInput} />
      </form>
      <ul>
        {model.items.map((item, index) => (
          <li key={index}>
            {item.done ? (
              <s onClick={() => cmd.RemoveItem(index)}>{item.text}</s>
            ) : (
              <b onClick={() => cmd.MarkItemAsDone(index)}>{item.text}</b>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

## Best practices

- Don't use React's `useRef` hook in Elm components
  - It's an anti-pattern
  - It doesn't fit well in the Elm architecture
- Don't mutate your model's arrays
  - I.e. Don't do `model.myArray.push(123); return {myArray};`
  - Use something like `ImmutableList` (imported from `@santerijps/elm-react/helpers`) to deal with updating the array
