import { Component } from "react"
import { STREAM_STATUS } from "../server/livestream_poller"
import { intervalToDuration, parseISO } from "date-fns"

export class CountdownTimer extends Component {
    constructor(props) {
        super(props)
        this.state = {
            label: '',
            status: props.status,
            nextStream: props.nextStream,
            pastStream: props.pastStream,
            intervalDuration: props.intervalDuration
        }
        this.state.label = this.formatLabel()
    }

    componentDidMount() {
        this.timerID = setInterval(() => this.tick(), 500)
    }

    componentWillUnmount() {
        clearInterval(this.timerID)
    }

    formatLabel() {
        const descriptor = (this.state.nextStream?.startTime) ? 'until' : 'without'
        try {
            const startDate = (descriptor === 'until') ? Date.now() : parseISO(this.state.pastStream.end_actual)
            if (descriptor === 'until' && startDate >= (endDate-900)) { return "Waiting for IRyS…"; }
            const d = Object(this.props.intervalDuration)
            return Object.keys(d).filter(k => { return d[k] > 0 }).map((k, i) => {
                return ((i > 0) ? ((k !== 'seconds') ? ', ' : ' and ') : '') + `${d[k]} ` + ((d[k] < 2) ? k.substr(0, k.length-1) : k)
            }).join('') + ` ${descriptor} IRyS`
        } catch (e) { return ''; }
    }

    tick() {
        this.setState({
            label: this.formatLabel()
        })
    }

    render() {
        if ((this.state.status !== STREAM_STATUS.OFFLINE && !this.state.nextStream?.startTime) || this.state.status === STREAM_STATUS.LIVE || (this.state.nextStream?.startTime === null && this.state.pastStream === null)) { this.componentWillUnmount(); return <></> }
        return <>
            {this.state.label}
            <p>{!this.state.nextStream?.startTime ? <span>(time since <a href={`https://www.youtube.com/watch?v=${this.state.pastStream.id}`}>{this.state.pastStream.title.trimLeft()}</a>)</span> : null}</p>
            </>
    }
}
