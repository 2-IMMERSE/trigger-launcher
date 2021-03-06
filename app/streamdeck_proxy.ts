/**
 * Copyright 2018 Centrum Wiskunde & Informatica
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { openStreamDeck, StreamDeck } from "elgato-stream-deck";

class StreamDeckProxy {
  private streamDeck?: StreamDeck;

  public constructor() {
    try {
      this.streamDeck = openStreamDeck();
    } catch {
      console.error("no StreamDecks connected, proxying all calls");
      this.streamDeck = undefined;
    }
  }

  public clearKey(index: number) {
    try {
      this.streamDeck && this.streamDeck.clearKey(index);
    } catch {
      console.error("lost connection to StreamDeck");
      this.streamDeck = undefined;
    }
  }

  public clearAllKeys() {
    try {
      this.streamDeck && this.streamDeck.clearAllKeys();
    } catch {
      console.error("lost connection to StreamDeck");
      this.streamDeck = undefined;
    }
  }

  public fillColor(index: number, r: number, g: number, b: number) {
    try {
      this.streamDeck && this.streamDeck.fillColor(index, r, g, b);
    } catch {
      console.error("lost connection to StreamDeck");
      this.streamDeck = undefined;
    }
  }

  public fillImage(index: number, buffer: Buffer) {
    try {
      this.streamDeck && this.streamDeck.fillImage(index, buffer);
    } catch {
      console.error("lost connection to StreamDeck");
      this.streamDeck = undefined;
    }
  }

  public setBrightness(brightness: number) {
    try {
      this.streamDeck && this.streamDeck.setBrightness(brightness);
    } catch {
      console.error("lost connection to StreamDeck");
      this.streamDeck = undefined;
    }
  }

  public onKeyUp(callback: (index: number) => void) {
    if (this.streamDeck) {
      this.streamDeck.on("up", (index) => {
        callback(index);
      });
    }
  }

  public onError(callback: (error: Error) => void) {
    if (this.streamDeck) {
      this.streamDeck.on("error", (error) => {
        callback(error as Error);
      });
    }
  }
}

export default StreamDeckProxy;
