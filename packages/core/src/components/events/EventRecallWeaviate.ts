import Rete from 'rete'

import {
  Event,
  EngineContext,
  NodeData,
  MagickNode,
  MagickWorkerInputs,
  MagickWorkerOutputs,
} from '../../../types'
import { InputControl } from '../../dataControls/InputControl'
import { triggerSocket, anySocket, eventSocket } from '../../sockets'
import { MagickComponent } from '../../magick-component'

const info = 'Event Recall is used to get conversation for an event and user'

//add option to get only events from max time difference (time diff, if set to 0 or -1, will get all events, otherwise will count in minutes)
type InputReturn = {
  output: unknown
}

export class EventRecallWeaviate extends MagickComponent<Promise<InputReturn>> {
  constructor() {
    super('Event Recall Weaviate')

    this.task = {
      outputs: {
        output: 'output',
        trigger: 'option',
      },
    }

    this.category = 'Events'
    this.display = true
    this.info = info
    this.runFromCache = true
  }

  builder(node: MagickNode) {
    const eventInput = new Rete.Input('event', 'Event', eventSocket)
    const out = new Rete.Output('output', 'Event', anySocket)
    const dataInput = new Rete.Input('trigger', 'Trigger', triggerSocket, true)
    const dataOutput = new Rete.Output('trigger', 'Trigger', triggerSocket)

    const nameInput = new InputControl({
      dataKey: 'name',
      name: 'Input name',
    })

    const type = new InputControl({
      dataKey: 'type',
      name: 'Type',
      icon: 'moon',
    })

    const max_count = new InputControl({
      dataKey: 'max_count',
      name: 'Max Count',
      icon: 'moon',
    })

    const max_time_diff = new InputControl({
      dataKey: 'max_time_diff',
      name: 'Max Time Difference',
      icon: 'moon',
    })

    node.inspector.add(nameInput).add(max_count).add(type).add(max_time_diff)

    return node
      .addInput(eventInput)
      .addInput(dataInput)
      .addOutput(dataOutput)
      .addOutput(out)
  }

  async worker(
    node: NodeData,
    inputs: MagickWorkerInputs,
    _outputs: MagickWorkerOutputs,
    { silent, magick }: { silent: boolean; magick: EngineContext }
  ) {
    const { getEventWeaviate  } = magick
    const eventObj = inputs['event'] && (inputs['event'][0] as Event)

    const { observer, client, channel, sender } = eventObj

    const typeData = node?.data?.type as string
    const type =
      typeData !== undefined && typeData.length > 0
        ? typeData.toLowerCase().trim()
        : 'none'

    const maxCountData = node.data?.max_count as string
    const maxCount = maxCountData ? parseInt(maxCountData) : 10
    const max_time_diffData = node.data?.max_time_diff as string
    const max_time_diff = max_time_diffData ? parseInt(max_time_diffData) : -1

    const events = await getEventWeaviate({
      type,
      sender,
      observer,
      client,
      channel,
      maxCount,
      max_time_diff,
    })
    if (!silent) node.display(`Event of ${type} found` || 'Not found')
    let conversation = '';

    // // for each event in events,
    // if(events) events.forEach((event) => {
    //   conversation += event.sender + ': ' + event.content + '\n';
    // });

    conversation = JSON.stringify(events);
    return {
      output: conversation ?? '',
    }
  }
}
