import React from 'react'
import SelectField from 'material-ui/SelectField'
import TextField from 'material-ui/TextField'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'
import DatePicker from 'material-ui/DatePicker'
import axios from "axios";
import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderColumn,
    TableRow,
    TableRowColumn,
} from 'material-ui/Table';
import moment from 'moment'
import JSONTree from 'react-json-tree'
import 'bootstrap/dist/css/bootstrap.css';
import * as d3 from 'd3'
import $ from 'jquery'
import {Tabs, Tab} from 'material-ui/Tabs'
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';

class MyComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            caseIdOptions: [],
            chosenCaseId: null,
            secondCaseId: null,
            start: "2016-01-01",
            end: "2016-08-15",
            ldaConfig: {
                numberOfTopics: 3,
                dirichletAlpha: 0.1,
                dirichletEta: 0.01,
                numberOfIterations: 1500,
                randomSeed: 1,
                numberOfDisplayedTopTopics: 3,
                displayedTopicsTopWords: 8,
                removeHighFrequentWords: 0.8,
                ignoreCapitalization: false,
                removeNumbers: true,
                stemming: false,
                removeStopwords: true,
                minimalWordLength: 3,
                timespan: 14,
                selectedTab: 'lda'
            },
            comments: [],
            ldaResult: null,
            secondldaResult: null,
            dictionaryResult: null,
            secondDictionaryResult: null,
            loading: false,
            topicbarData: {},
            secondTopicbarData: {},
            dictionaryBarData: {},
            secondDictionaryBarData: {},
            second: false,
            customText: '',
            resultColdWords: [],
            resultWarmWords: []
        };
    }

    componentDidMount(){
        axios.get('distinct-project-ids/')
            .then(res => this.setState({caseIdOptions: res.data.project_ids}, () => {
                this.setState({chosenCaseId: 3, secondCaseId: 7})
            }))
            .catch(err => console.log(err));
    }

    getCookie = (name) => {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    buildDictionaryBarData = (result=undefined, second=false) => {
        this.setState({loading: true})

        let bar_data = result.map((entry) => {
            return {name: entry.id, Kalt: entry.counters.Kalt, Warm: entry.counters.Warm}
        })
        if(second){
            this.setState({secondDictionaryBarData: bar_data, loading: false})
        }else{
            this.setState({dictionaryBarData: bar_data, loading: false})
        }
    }

    buildTopicBarData = (entries_object, topics_object, second=false) => {
        this.setState({loading: true})
        var bars_data = {};
        bars_data['topic-datasets'] = {};

        var n_entries = Object.keys(entries_object).length;
        var entry_name_list = new Array(n_entries);
        for (var entry in entries_object){
            entry_name_list[entries_object[entry]['position']] = entry;
        }
        bars_data['entry-names'] = entry_name_list;

        var topic_list = [];
        for (var topic in topics_object){
            topic_list.push(topic);

            var dataset = new Array(n_entries+1).join('0').split('').map(parseInt);
            for (var position in entry_name_list){
                var topic_prob = entries_object[entry_name_list[position]]['topic_probabilities'][topic];
                dataset[position] = topic_prob;
            }
            bars_data['topic-datasets'][topic] = dataset;
        }
        topic_list.sort();
        bars_data['topic-list'] = topic_list;
        if(second){
            this.setState({secondTopicbarData: bars_data, loading: false}, () => {this.paint_topicbars(true); this.paint_topicbars();})
        }else{
            this.setState({topicbarData: bars_data, loading: false}, () => {this.paint_topicbars()})
        }
    }

    paint_topicbars = (second=false) => {
        if(second){
            $('#lda-second-topic-bars').empty();
        }else{
            $('#lda-topic-bars').empty();
        }

        var bar_data = second ? this.state.secondTopicbarData : this.state.topicbarData
        var topic_list = bar_data['topic-list'];
        var topic_datasets = bar_data['topic-datasets'];
        var entry_names = bar_data['entry-names'];
        var topics_data = second ? this.state.secondLdaResult.topics : this.state.ldaResult.topics;
        var top_words_key = 'top_words';


        var shortNames = entry_names
        shortNames.push('undefined'); //fixes scale issue offset of one

        for (var i in topic_list){
            var topic = topic_list[i];
            if(second){
                var ldaTopicBar = $('.lda-second-topic-bar-template').clone();
                ldaTopicBar.toggleClass('lda-second-topic-bar-template lda-second-topic-bar template');
                ldaTopicBar.attr("id", "second" + topic +"_entries_distri");
                ldaTopicBar.find('.lda-second-topic-bar-name').text(topic);
                ldaTopicBar.find('.lda-second-topic-bar-name').attr('title', topics_data[topic][top_words_key].join());
                ldaTopicBar.appendTo('#lda-second-topic-bars');
            }else{
                var ldaTopicBar = $('.lda-topic-bar-template').clone();
                ldaTopicBar.toggleClass('lda-topic-bar-template lda-topic-bar template');
                ldaTopicBar.attr("id", topic +"_entries_distri");
                ldaTopicBar.find('.lda-topic-bar-name').text(topic);
                ldaTopicBar.find('.lda-topic-bar-name').attr('title', topics_data[topic][top_words_key].join());
                ldaTopicBar.appendTo('#lda-topic-bars');
            }

            var w = ldaTopicBar.width();
            var h = 200;
            var barPadding = 1;
            var barHeightPadding = 50;

            var xScale = d3.scale.linear()
                .domain([0, topic_datasets[topic].length])
                .range([0,w]);

            var axeScale = d3.scale.ordinal()
                .domain(shortNames)
                .rangePoints([0, w]);

            var yScale = d3.scale.linear()
                .domain([0, 1])
                .range([0, h-barHeightPadding]);

            var colorScale = d3.scale.linear()
                .domain([0, d3.max(topic_datasets[topic], function(d){
                    return d;
                })])
                .range([0, 200]);

            //Create SVG element
            var svg = d3.select("#" + ldaTopicBar.attr("id"))
                .append("svg")
                .attr("width", w)
                .attr("height", h);

            //Append rectangles
            svg.selectAll("rect")
                .data(topic_datasets[topic])
                .enter()
                .append("rect")
                .attr("x", function(d, i) {
                    return xScale(i);
                })
                .attr("y", function(d) {
                    return h-barHeightPadding - yScale(d);  //Height minus data value
                })
                .attr("width", w / topic_datasets[topic].length - barPadding)
                .attr("height", function(d) {
                    return yScale(d);  //Just the data value
                }).attr("fill", function(d) {
                return "rgb(0, " + parseInt(colorScale(d)) + ", 0)";
            });

            //format to percent
            var format2Perc = d3.format(".1%");

            //percentage text
            svg.selectAll("text")
                .data(topic_datasets[topic])
                .enter()
                .append("text").text(function(d) {
                if (d>0.15) return format2Perc(d);
                else return '';
            })
                .attr("x", function(d, i) {
                    return i * (w / topic_datasets[topic].length) + (w / topic_datasets[topic].length - barPadding) / 2;
                })
                .attr("y", function(d) {
                    return h - barHeightPadding - yScale(d) + 10;
                })
                .attr("font-family", "sans-serif")
                .attr("font-size", "10px")
                .attr("fill", "white")
                .attr("text-anchor", "middle");

            var xAxis = d3.svg.axis()
                .scale(axeScale)
                .orient("bottom")

            svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate("+(w / topic_datasets[topic].length - barPadding) / 2+"," + (h - barHeightPadding+2) + ")")
                .call(xAxis);

        }
    }

    startAnalysis = () => {
        this.setState({loading: true})
        let config = {
            headers: {
                "X-CSRFToken": this.getCookie('csrftoken'),
            }
        }
        axios.post('start-analysis/', {
            chosenCaseId: this.state.chosenCaseId,
            start: this.state.start,
            end: this.state.end,
            config: this.state.ldaConfig
        }, config)
            .then(res => this.setState({
                comments: res.data['hours'],
                ldaResult: res.data['lda_result'],
                dictionaryResult: res.data['dictionary_result'],
                resultWarmWords: res.data['warm_words'],
                resultColdWords: res.data['cold_words'],
                loading: false
            }, () => {
                this.buildTopicBarData(this.state.ldaResult.entries, this.state.ldaResult.topics)
                this.buildDictionaryBarData(this.state.dictionaryResult)
            }))
            .catch(err => {this.setState({loading: false}); alert(err)});
    }

    startCustomAnalysis = () => {
        this.setState({loading: true})
        let config = {
            headers: {
                "X-CSRFToken": this.getCookie('csrftoken'),
            }
        }
        axios.post('start-custom-analysis/', {
            customText: this.state.customText,
            config: this.state.ldaConfig
        }, config)
            .then(res => this.setState({
                comments: res.data['hours'],
                ldaResult: res.data['lda_result'],
                dictionaryResult: res.data['dictionary_result'],
                loading: false
            }, () => {
                this.buildTopicBarData(this.state.ldaResult.entries, this.state.ldaResult.topics)
                this.buildDictionaryBarData(this.state.dictionaryResult)
            }))
            .catch(err => {this.setState({loading: false}); alert(err)});
    }

    startSecondAnalysis = () => {
        this.setState({loading: true})
        let config = {
            headers: {
                "X-CSRFToken": this.getCookie('csrftoken'),
            }
        }
        axios.post('start-analysis/', {
            chosenCaseId: this.state.secondCaseId,
            start: this.state.start,
            end: this.state.end,
            config: this.state.ldaConfig
        }, config)
            .then(res => this.setState({
                comments: this.state.comments.concat(res.data['hours']),
                second: true,
                secondLdaResult: res.data['lda_result'],
                secondDictionaryResult: res.data['dictionary_result'],
                loading: false
            }, () => {
                this.buildTopicBarData(this.state.secondLdaResult.entries, this.state.secondLdaResult.topics, true)
                this.buildDictionaryBarData(this.state.secondDictionaryResult, true)
            }))
            .catch(err => {this.setState({loading: false}); alert(err)});
    }

    setConfig = (fieldName, value) => {
        let ldaConfig = this.state.ldaConfig
        ldaConfig[fieldName] = value
        this.setState({ldaConfig: ldaConfig})
    }


    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-md-6">
                        <TextField floatingLabelText={"Freitext"} onChange={(e, newValue) => {
                            this.setState({customText: newValue})
                        }} value={this.state.customText}
                            multiLine
                                   rows={3}
                        />
                    </div>
                    <div className="col-md-3">
                        <RaisedButton style={{marginTop: '20px', width: '100%'}} disabled={this.state.loading}
                                      label={this.state.loading ? 'Warte auf Antwort...' : "Freitext analysieren"}
                                      onClick={() => {
                                          this.startCustomAnalysis()
                                      }}/>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-3">
                        <SelectField
                            floatingLabelText={"Fall-ID"}
                            onChange={(e, index, value) => {
                                this.setState({chosenCaseId: value})
                            }}
                            value={this.state.chosenCaseId}
                            style={{float: 'left', marginLeft: '20px', marginRight: '20px'}}
                        >
                            {this.state.caseIdOptions.map((caseId) => {
                                return (<MenuItem primaryText={caseId} value={caseId}/>)
                            })}
                        </SelectField>
                        <SelectField
                            floatingLabelText={"Vergleichsfall"}
                            onChange={(e, index, value) => {
                                this.setState({secondCaseId: value})
                            }}
                            value={this.state.secondCaseId}
                            style={{float: 'left', marginLeft: '20px', marginRight: '20px'}}
                        >
                            {this.state.caseIdOptions.map((caseId) => {
                                return (<MenuItem primaryText={caseId} value={caseId}/>)
                            })}
                        </SelectField>
                        <DatePicker
                            hintText={"Startdatum"}
                            defaultDate={new Date("01-01-2016")}
                            onChange={(e, newValue) => {
                                this.setState({start: moment(newValue).format("YYYY-MM-DD")})
                            }}
                        />
                        <DatePicker
                            hintText={"Enddatum"}
                            defaultDate={new Date("08-15-2016")}
                            onChange={(e, newValue) => {
                                this.setState({end: moment(newValue).format("YYYY-MM-DD")})
                            }}
                        />
                        <TextField floatingLabelText={"Anzahl der zusammenzufassenden Tage"} onChange={(e, newValue) => {
                            this.setConfig('timespan', newValue)
                        }} value={this.state.ldaConfig.timespan}/>

                        <RaisedButton style={{marginTop: '20px', width: '100%'}} disabled={this.state.loading}
                                      label={this.state.loading ? 'Warte auf Antwort...' : "Analyse starten"}
                                      onClick={() => {
                                          this.startAnalysis()
                                      }}/>
                        <RaisedButton style={{marginTop: '20px', width: '100%'}} disabled={this.state.loading}
                                      label={this.state.loading ? 'Warte auf Antwort...' : "Vergleichsfall analysieren"}
                                      onClick={() => {
                                          this.startSecondAnalysis()
                                      }}/>
                    </div>
                    <div className="col-md-3">
                        <TextField floatingLabelText={"Anzahl der Themen"} onChange={(e, newValue) => {
                            this.setConfig('numberOfTopics', newValue)
                        }} value={this.state.ldaConfig.numberOfTopics}/>
                        <TextField floatingLabelText={"Dirichlet Alpha"} onChange={(e, newValue) => {
                            this.setConfig('dirichletAlpha', newValue)
                        }} value={this.state.ldaConfig.dirichletAlpha}/>
                        <TextField floatingLabelText={"Dirichlet Eta"} onChange={(e, newValue) => {
                            this.setConfig('dirichletEta', newValue)
                        }} value={this.state.ldaConfig.dirichletEta}/>
                        <TextField floatingLabelText={"Anzahl der Iterationen"} onChange={(e, newValue) => {
                            this.setConfig('numberOfIterations', newValue)
                        }} value={this.state.ldaConfig.numberOfIterations}/>
                    </div>
                    <div className="col-md-3">
                        <TextField floatingLabelText={"Anzahl der dargestellten Top-Themen"}
                                   onChange={(e, newValue) => {
                                       this.setConfig('numberOfDisplayedTopTopics', newValue)
                                   }} value={this.state.ldaConfig.numberOfDisplayedTopTopics}/>
                        <TextField floatingLabelText={"Anzahl der dargestellten Top-Wörter"}
                                   onChange={(e, newValue) => {
                                       this.setConfig('displayedTopicsTopWords', newValue)
                                   }} value={this.state.ldaConfig.displayedTopicsTopWords}/>
                        <SelectField floatingLabelText={"Stammwortreduktion"} onChange={(e, index, newValue) => {
                            this.setConfig('stemming', newValue)
                        }} value={this.state.ldaConfig.stemming}>
                            <MenuItem primaryText={"Ja"} value={true}/>
                            <MenuItem primaryText={"Nein"} value={false}/>
                        </SelectField>
                        <SelectField floatingLabelText={"Stoppwortreduktion"} onChange={(e, index, newValue) => {
                            this.setConfig('removeStopwords', newValue)
                        }} value={this.state.ldaConfig.removeStopwords}>
                            <MenuItem primaryText={"Ja"} value={true}/>
                            <MenuItem primaryText={"Nein"} value={false}/>
                        </SelectField>
                    </div>
                    <div className="col-md-3">
                        <TextField floatingLabelText={"Frequenz der zu entfernenden hoch-frequenten Wörter"}
                                   onChange={(e, newValue) => {
                                       this.setConfig('removeHighFrequentWords', newValue)
                                   }} value={this.state.ldaConfig.removeHighFrequentWords}/>
                        <SelectField floatingLabelText={"Groß-Kleinschreibung ignorieren"}
                                     onChange={(e, index, newValue) => {
                                         this.setConfig('ignoreCapitalization', newValue)
                                     }} value={this.state.ldaConfig.ignoreCapitalization}>
                            <MenuItem primaryText={"Ja"} value={true}/>
                            <MenuItem primaryText={"Nein"} value={false}/>
                        </SelectField>
                        <SelectField floatingLabelText={"Zahlen entfernen"} onChange={(e, index, newValue) => {
                            this.setConfig('removeNumbers', newValue)
                        }} value={this.state.ldaConfig.removeNumbers}>
                            <MenuItem primaryText={"Ja"} value={true}/>
                            <MenuItem primaryText={"Nein"} value={false}/>
                        </SelectField>
                        <TextField floatingLabelText={"Minimale Wortlänge"} onChange={(e, newValue) => {
                            this.setConfig('minimalWordLength', newValue)
                        }} value={this.state.ldaConfig.minimalWordLength}/>
                    </div>
                </div>
                <hr/>
                <Tabs onChange={(value) => {this.setState({selectedTab: value})}}>
                    <Tab label={"LDA"} value={"lda"} onActive={() => {this.setState({selectedTab: 'lda'})}}>
                        {!this.state.second ?
                            <div className={"col-md-12"}>
                                <div>
                                    {this.state.ldaResult && this.state.ldaResult.topics ? Object.keys(this.state.ldaResult.topics).map((topic) => {
                                        return (
                                            <div>
                                                {topic}:
                                                <ul>
                                                    {this.state.ldaResult.topics[topic].top_words.map((word) => {
                                                        return(`${word}, `)
                                                    })}
                                                </ul>
                                            </div>
                                        )
                                    }) : <div/>}
                                </div>

                                <div>
                                    <div id="lda-topic-bars" className="col-xs-12 empty_on_reset">

                                    </div>
                                    <div className="lda-topic-bar-template col-xs-12 template panel panel-default">
                                        <strong><span className="lda-topic-bar-name col-xs-12" data-toggle="tooltip" data-placement="top" title=""></span></strong>
                                    </div>
                                </div>
                            </div>


                            :

                            <div className={"row"}>
                                <div className={"col-md-6"}>
                                    <div style={{minHeight: '350px'}}>
                                        {this.state.ldaResult && this.state.ldaResult.topics ? Object.keys(this.state.ldaResult.topics).map((topic) => {
                                            return (
                                                <div>
                                                    {topic}:
                                                    <ul>
                                                        {this.state.ldaResult.topics[topic].top_words.map((word) => {
                                                            return(`${word}, `)
                                                        })}
                                                    </ul>
                                                </div>
                                            )
                                        }) : <div/>}
                                    </div>

                                    <div>
                                        <div id="lda-topic-bars" className="col-xs-12 empty_on_reset">

                                        </div>
                                        <div className="lda-topic-bar-template col-xs-12 template panel panel-default">
                                            <strong><span className="lda-topic-bar-name col-xs-12" data-toggle="tooltip" data-placement="top" title=""></span></strong>
                                        </div>
                                    </div>
                                </div>
                                <hr/>
                                <div className={"col-md-6"}>
                                    <div style={{minHeight: '350px'}}>
                                        {this.state.secondLdaResult && this.state.secondLdaResult.topics ? Object.keys(this.state.secondLdaResult.topics).map((topic) => {
                                            return (
                                                <div>
                                                    {topic}:
                                                    <ul>
                                                        {this.state.secondLdaResult.topics[topic].top_words.map((word) => {
                                                            return(`${word}, `)
                                                        })}
                                                    </ul>
                                                </div>
                                            )
                                        }) : <div/>}
                                    </div>
                                    <div id="lda-second-topic-bars" className="col-xs-12 empty_on_reset">
                                    </div>
                                    <div className="lda-second-topic-bar-template col-xs-12 template panel panel-default">
                                        <strong><span className="lda-second-topic-bar-name col-xs-12" data-toggle="tooltip" data-placement="top" title=""></span></strong>
                                    </div>
                                </div>
                                <hr/>
                            </div>


                        }
                    </Tab>
                    <Tab label={"Wörterbuch"} value={"dictionary"} onActive={() => {this.setState({selectedTab: 'dictionary'})}}>
                        {this.state.second ?
                            <div className={"row"}>
                                <div className={"col-md-6"}>
                                    {Object.keys(this.state.dictionaryBarData).length ?
                                        <BarChart
                                            width={600}
                                            height={400}
                                            data={this.state.dictionaryBarData}
                                            stackOffset="sign"
                                            margin={{
                                                top: 5, right: 30, left: 20, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis dataKey="name"/>
                                            <YAxis/>
                                            <Tooltip/>
                                            <Legend/>
                                            <ReferenceLine y={0} stroke="#000"/>
                                            <Bar dataKey="Warm" fill="#F2314B" stackId="stack"/>
                                            <Bar dataKey="Kalt" fill="#0F5B94" stackId="stack"/>
                                        </BarChart>
                                        : <div/>}
                                </div>
                                <div className={"col-md-6"}>
                                    {Object.keys(this.state.secondDictionaryBarData).length ?
                                        <BarChart
                                            width={600}
                                            height={400}
                                            data={this.state.secondDictionaryBarData}
                                            stackOffset="sign"
                                            margin={{
                                                top: 5, right: 30, left: 20, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis dataKey="name"/>
                                            <YAxis/>
                                            <Tooltip/>
                                            <Legend/>
                                            <ReferenceLine y={0} stroke="#000"/>
                                            <Bar dataKey="Warm" fill="#F2314B" stackId="stack"/>
                                            <Bar dataKey="Kalt" fill="#0F5B94" stackId="stack"/>
                                        </BarChart>
                                        : <div/>}
                                </div>
                            </div>
                            : <div>
                            {Object.keys(this.state.dictionaryBarData).length ?
                                <div className={"center"}>
                                    <div>
                                        Warm:
                                        <br/>
                                        {this.state.dictionaryResult && this.state.resultWarmWords.map((word) => {
                                            return (
                                                <span>{word}, </span>)
                                        })}
                                        <br/>
                                        Kalt:
                                        <br/>
                                        {this.state.dictionaryResult && this.state.resultColdWords.map((word) => {
                                            return (
                                                <span>{word}, </span>)
                                        })}
                                    </div>
                                    <BarChart
                                        width={600}
                                        height={400}
                                        data={this.state.dictionaryBarData}
                                        stackOffset="sign"
                                        margin={{
                                            top: 5, right: 30, left: 20, bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="name"/>
                                        <YAxis/>
                                        <Tooltip/>
                                        <Legend/>
                                        <ReferenceLine y={0} stroke="#000"/>
                                        <Bar dataKey="Warm" fill="#F2314B" stackId="stack"/>
                                        <Bar dataKey="Kalt" fill="#0F5B94" stackId="stack"/>
                                    </BarChart>
                                </div>
                                : <div/>}
                        </div>}

                        <hr/>
                    </Tab>
                </Tabs>
                <div className="row col-xs-6">
                    <Table>
                        <TableHeader
                            displaySelectAll={false}
                            adjustForCheckbox={false}
                            enableSelectAll={false}
                        >
                            <TableRow>
                                <TableHeaderColumn style={{width: '10%'}}>ID</TableHeaderColumn>
                                <TableHeaderColumn style={{width: '15%'}}>Start</TableHeaderColumn>
                                <TableHeaderColumn style={{width: '15%'}}>Ende</TableHeaderColumn>
                                <TableHeaderColumn style={{width: '60%'}}>Eintrag</TableHeaderColumn>
                            </TableRow>
                        </TableHeader>
                        <TableBody
                            displayRowCheckbox={false}
                            deselectOnClickaway={false}
                            showRowHover={false}
                            stripedRows={false}
                        >
                            {this.state.comments.map((comment) => {
                                return(<TableRow>
                                    <TableRowColumn style={{width: '10%'}}>{comment.id}</TableRowColumn>
                                    <TableRowColumn style={{width: '15%'}}>{moment(comment.start).format('DD.MM.YYYY, LT')}</TableRowColumn>
                                    <TableRowColumn style={{width: '15%'}}>{moment(comment.stop).format('DD.MM.YYYY, LT')}</TableRowColumn>
                                    <TableRowColumn style={{width: '60%'}}>{<span onClick={() => {alert(comment.comment)}}>{comment.comment}</span>}</TableRowColumn>
                                </TableRow>)
                            })}
                        </TableBody>
                    </Table>
                </div>
                <hr/>
                {/*<JSONTree data={this.state.ldaResult}/>*/}
                <hr/>
            </div>
        );
    }
}

export default MyComponent