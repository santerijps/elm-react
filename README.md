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
import { Cmd, UpdateParams, useelm-react } from "@santerijps/elm-react";



// MAIN


export default function () {
  return useElm(init, update, view, undefined);
}



// MODEL


type Model = number;


const init = () =>
  0



// UPDATE


type Msg = 'Increment' | 'Decrement'


const update = ({ msg, model }: Update<Model, Msg, undefined>) =>
  ( msg == 'Increment' ? model + 1
  : msg == 'Decrement' ? model - 1
  : model
  )



// VIEW


const view = ({ cmd, model }: View<Model, Msg, undefined>) =>
  <div>
    <button onClick={cmd.Decrement}>{'-'}</button>
    <div>{model}</div>
    <button onClick={cmd.Increment}>{'+'}</button>
  </div>

```