import * as React from "react";
import * as io from "socket.io-client";

import StreamDeck from "../streamdeck_proxy";
import { makeRequest, getApplicationConfig, fetchImage } from "../util";
import EventContainer from "./event_container";

export type ParamTypes = "duration" | "time" | "string" | "url" | "const" | "set" | "selection";

export interface EventParams {
  type: ParamTypes;
  name: string;
  parameter: string;
  value?: string;
  options?: Array<{label: string, value: string}>;
  required?: boolean;
}

export interface Event {
  trigger: boolean;
  modify: boolean;
  id: string;
  parameters: Array<EventParams>;
  name: string;
  state: "abstract" | "ready" | "active";
  longdesc?: string;
  previewUrl?: string;
  verb?: string;
  productionId: string;
}

interface TriggerLauncherProps {
  documentId: string;
  clearSession: () => void;
}

interface TriggerLauncherState {
  buttonAssignments: Array<Event | null>;
}

class TriggerLauncher extends React.Component<TriggerLauncherProps, TriggerLauncherState> {
  private socket: SocketIOClient.Socket;
  private streamDeck: StreamDeck;
  private eventContainerRefs: Array<EventContainer | null> = new Array(15).fill(null);

  public constructor(props: any) {
    super(props);

    this.streamDeck = new StreamDeck();

    this.state = {
      buttonAssignments: new Array(15).fill(null)
    };
  }

  private subscribeToEventUpdates() {
    const { serverUrl } = getApplicationConfig();

    makeRequest("GET", `${serverUrl}/api/v1/configuration`).then((data) => {
      const { websocketService }: { [index: string]: string } = JSON.parse(data);
      const { documentId } = this.props;

      const url = websocketService.replace(/\/$/, "") + "/trigger";
      console.log("Connecting to", url);

      this.socket = io(url, { transports: ["websocket"] });

      this.socket.on("connect", () => {
        console.log("Connected to websocket-service");

        this.socket.emit("JOIN", documentId, () => {
          console.log("Joined channel for document ID", documentId);
        });
      });

      this.socket.on("EVENTS", (data: { events: Array<Event> }) => {
        console.log("Received trigger event update");
        const { events } = data;

        this.parseButtonAssignments(events);
      });
    });
  }

  private fetchEvents() {
    const { serverUrl } = getApplicationConfig();
    const url = `${serverUrl}/api/v1/document/${this.props.documentId}/events`;

    makeRequest("GET", url).then((data) => {
      const events: Array<Event> = JSON.parse(data);
      this.parseButtonAssignments(events);
    });
  }

  private parseButtonAssignments(events: Array<Event>) {
    let { buttonAssignments } = this.state;

    const activeEvents = events.filter((ev) => ev.state === "active");
    let enqueuedEvents = events.filter((ev) => ev.state === "ready").map((event) => {
      const activeResult = activeEvents.find((active) => {
        return active.productionId === event.productionId;
      });

      return activeResult || event;
    });

    for (let i = 0; i < buttonAssignments.length; i++) {
      const buttonAssignment = buttonAssignments[i];

      if (buttonAssignment != null) {
        const result = enqueuedEvents.findIndex((ev) => ev.productionId === buttonAssignment.productionId);
        buttonAssignments[i] = (result >= 0) ? enqueuedEvents.splice(result, 1)[0] : null;
      }
    }

    for (let i = 0; i < buttonAssignments.length; i++) {
      const buttonAssignment = buttonAssignments[i];

      if (buttonAssignment == null) {
        buttonAssignments[i] = enqueuedEvents.shift() || null;
      }
    }

    this.setState({
      buttonAssignments
    });
  }

  public componentDidMount() {
    window.onbeforeunload = () => {
      console.log("window about to close...");
      this.streamDeck.clearAllKeys();
    };

    this.streamDeck.clearAllKeys();
    this.streamDeck.setBrightness(100);

    this.streamDeck.onKeyUp((index) => {
      console.log("StreamDeck button pressed:", index);

      if (this.eventContainerRefs[index]) {
        console.log("Launching event...");
        this.eventContainerRefs[index]!.launchEvent();
      }
    });

    this.streamDeck.onError((error) => {
      console.error("StreamDeck:", error);
    });

    this.fetchEvents();
    this.subscribeToEventUpdates();
  }

  public componentWillUnmount() {
    this.streamDeck.clearAllKeys();
    this.socket.close();
  }

  private initializeButton(event: Event | null, i: number) {
    if (event == null) {
      this.streamDeck.clearKey(i);
      return;
    }

    if (event.state === "active") {
      if (event.previewUrl) {
        fetchImage(event.previewUrl).then((img) => {
          img.background("#1DCB00").resize(60, 60).extend(6).flatten().raw().toBuffer().then((bufferWithFrame) => {
            this.streamDeck.fillImage(i, bufferWithFrame);
          });

        }).catch(() => {
          console.log("Could not fetch image");
        });
      } else {
        this.streamDeck.fillColor(i, 255, 0, 0);
      }
    } else {
      if (event.previewUrl) {
        fetchImage(event.previewUrl).then((img) => {
          img.background("#000000").resize(60, 60).extend(6).flatten().raw().toBuffer().then((buffer) => {
            this.streamDeck.fillImage(i, buffer);
          });
        }).catch(() => {
          console.log("Could not fetch image");
        });
      } else {
        this.streamDeck.fillColor(i, 255, 255, 255);
      }
    }
  }

  public render() {
    const { documentId, clearSession } = this.props;
    const { buttonAssignments } = this.state;

    return (
      <div>
        <div className="grid">
          {buttonAssignments.map((event, i) => {
            this.initializeButton(event, i);

            if (event == null) {
              return <div key={i} />;
            }

            return (
              <EventContainer documentId={documentId}
                              ref={(e) => this.eventContainerRefs[i] = e}
                              onTriggered={this.fetchEvents.bind(this)}
                              event={event} key={i} />
            );
          })}
        </div>
        <div className="remoteControl">
          <button style={{margin: 8}}
                  className="button is-danger"
                  onClick={clearSession.bind(this)}>
            Clear Session
          </button>
        </div>
      </div>
    );
  }
}

export default TriggerLauncher;
