#!/bin/env node

//TODO: Start on this line of the diagram
//  uml:Diagram diagramType="InteractionDiagram" documentation="" name="VC Issuance - Sequence" toolName="Visual Paradigm" xmi:id="VjyV8t6GAqBwAQlL"
//  walk through the diagrams to get the lifeline names/messages then construct from there
//  order operations by Y value, order lifelines/actors by X values and combine actors/lifelines

const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

project = loadXml();

var lifelines = extractLifelines(project);
var fragments = extractFragments(project);
var messages = extractMessages(project);

var diagrams = extractDiagrams(project)

var mermaid = generateMermaid(diagrams, messages);


// loadXml loads and parses an xmi formatted serialization of a sequence
// diagram.
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function loadXml() {
  const pOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  };

  var parser = new XMLParser(pOptions);
  var xml = fs.readFileSync('test1.xml', 'utf8');
  var result = parser.parse(xml);

  //console.log(JSON.stringify(result, null, 2));
  return result;
}

// Extract diagrams finds all of the diagrams in the uml and
// returns them in a consise, ordered JSON array
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractDiagrams(result) {
  var  xmiDiagrams = result['xmi:XMI']['uml:Diagram'];

  let diagrams = [];
  xmiDiagrams.forEach(d => {
    //console.log(d)
    var xmiElements = d['uml:Diagram.element']['uml:DiagramElement']
    let elements = [];
    xmiElements.forEach(e => {
      let elem = {
        geometry: e['@_geometry'],
        preferredShapeType: e['@_preferredShapeType'],
        subject: e['@_subject'],
        xmiId: e['@_xmi:id'],
        fromDiagramElement: e['@_fromDiagramElement'],
        toDiagramElement: e['@_toDiagramElement']
      }
      elements.push(elem)
    })
    let dgm = {
      diagramType: d['@_diagramType'],
      documentation: d['@_documentation'],
      name: d['@_name'],
      toolName: d['@_toolName'],
      xmiId: d['@_xmi:id'],
      diagramElements: elements

    }
    diagrams.push(dgm);
  })

  //console.log(diagrams)
  return diagrams;
}

// find collaborators owned member finds the index of the
// ownedMember array that has type uml:Collaboration
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function findCollaborationOwnedMember(umlModel) {
  var index = 0;
  
  let ownedMemberArr = [];
  ownedMemberArr = umlModel['ownedMember']

  ownedMemberArr.forEach(member => {
    console.log(member)
    if(member['@_xmi:type'] == 'uml:Collaboration')
      index = ownedMemberArr.indexOf(member)    
  })

  return index;
}

// Extract lifelines finds all of the lifelines in the diagram and
// returns them in a concise, ordered JSON array
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractLifelines(result) {
  var umlModel = result['xmi:XMI']['uml:Model'];
  var collaboratorsIndex = findCollaborationOwnedMember(umlModel);
  var xmlLifelines = result['xmi:XMI']['uml:Model'].ownedMember[collaboratorsIndex].ownedBehavior[0].lifeline;

  let lifelines = [];
  xmlLifelines.forEach(l => {
    //  console.log(l);
    let lfl = {
      name: l['@_name'],
      id: l['@_xmi:id'],
      type: l['@_xmi:type']
    }
    lifelines.push(lfl);
    //  console.log(lfl);
  })

  return lifelines;
}

// Extract fragments finds all of the lifelines in the diagram and
// returns them in a concise, ordered JSON array.
// Fragments include the link that specifies which lifeline
// is associated with the send/receive properties of a message
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractFragments(result) {
  var umlModel = result['xmi:XMI']['uml:Model'];
  var collaboratorsIndex = findCollaborationOwnedMember(umlModel);
  let xmlFragments = result['xmi:XMI']['uml:Model'].ownedMember[collaboratorsIndex].ownedBehavior[0].fragment;

  let frags = {};
  xmlFragments.forEach(f => {
    let frag = {
      id: f['@_xmi:id'],
      msg: f['@_message'],
      type: f['@_xmi:type'],
      covered: f['@_covered']
    };
    frags[frag.id] = frag;
  });

  return frags;
}

// lookupEventTarget takes the id used to specify send/receive
// targets in messages and returns the human-readable name
// of that target.
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function lookupEventTarget(targetId) {
  if (targetId in fragments) {
    let target = fragments[targetId].covered;
    let lifeline = lifelines.find(l => l.id == target);
    if(!lifeline) {
      console.log("One of your diagrams has hidden lifelines, delete them!")
      return "Lifeline not found"
    }
    console.log('looking up lifeline ' + target + ':' + lifeline );

    return lifeline.name;
  }
  else {
    console.log('fragment not found ' + targetId);
    return null;
  }
}

function extractOwnedOperationsMsg(msg, umlModel) {
  let msgText = '';
  umlModel.ownedMember.forEach(member => {
    var ownedOp = member.ownedOperation;

    //console.log(ownedOp);
    if(ownedOp) {
      if(!ownedOp[0])
        ownedOp = [ownedOp];

      ownedOp.forEach(param => {
        let modelTransition = {
          'from': param['xmi:Extension']['modelTransition']['@_from'],
          'to': param['xmi:Extension']['modelTransition']['@_to']
        };
        var idFrom = -1;
        var idTo = -1;
        if(modelTransition['from'])
          idFrom = modelTransition['from'].indexOf(msg.id);
        if(modelTransition['to'])
          idTo = modelTransition['to'].indexOf(msg.id);
        //console.log(idFrom, idTo);

        if(idFrom != -1 || idTo != -1) {
          msgText = param['@_name'];
        }
      })
    }
  })

  return msgText;
}

// Extract messages finds all of the messages in the diagram and
// returns them in a concise, ordered JSON array.
// This includes dereferencing the send/receive targets using
// the fragments variable.
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractMessages(result) {
  var umlModel = result['xmi:XMI']['uml:Model'];
  var collaboratorsIndex = findCollaborationOwnedMember(umlModel);
  let xmlMessages = result['xmi:XMI']['uml:Model'].ownedMember[collaboratorsIndex].ownedBehavior[0].message;

  let ms = [];
  xmlMessages.forEach(m => {
      console.log(m);
    // start with the properties that every message has
    let msg = {
      text: m['@_name'], // Is this actually always set?
      from: lookupEventTarget(m['@_sendEvent']),
      to: lookupEventTarget(m['@_receiveEvent']),
      id: m['@_xmi:id'],
      async: m['xmi:Extension'].asynshronous['@_xmi:value'], // Is this actually always set?
      type: m['@_xmi:type'],
      number: Number(m['xmi:Extension'].number['@_xmi:value'])
    }
    // now grab the two properties that may or may not be in the data set
    if ('fromActivation' in m['xmi:Extension']) {
      msg.fromActivation = m['xmi:Extension'].fromActivation['activation']['@_xmi:value'];

    }
    if ('toActivation' in m['xmi:Extension']) {
      msg.toActivation = m['xmi:Extension'].toActivation['activation']['@_xmi:value'];
    }

    if(!msg['text']){
      var msgText = extractOwnedOperationsMsg(msg, umlModel)
      msg.text = msgText
    }
    
    ms.push(msg);
  });

  ms = ms.sort((a, b) => a.number - b.number);
  return ms;
}

function getDiagramLifelines(diagramElements) {
  let lifelines = []
  diagramElements.forEach(elem => {
    if(elem['preferredShapeType'] == 'InteractionLifeLine' ||
        elem['preferredShapeType'] == 'InteractionActor')
        lifelines.push(elem)
  })

  return lifelines
}

function getYVal(geometry) {
  var xAndY = String(geometry).split(';')
  var yVal = Number(String(xAndY).split(',')[1])
  return yVal
}

function orderDiagramMessages(diagramElements) {
  let messages = []
  diagramElements.forEach(elem => {
    if(elem['preferredShapeType'] == 'Message')
      messages.push(elem)
  })

  var numMsg = messages.length;
  for(let i = 0; i < numMsg; i++) {
    for(let j = 0; j < numMsg - 1; j++) {
      if(getYVal(messages[j]['geometry']) > getYVal(messages[j + 1]['geometry'])) {
        let tmp = messages[j];
        messages[j] = messages[j + 1];
        messages[j + 1] = tmp;
      }
    }
  }

  return messages;
}

function generateInteractionDiagramMermaid(diagram, messages) {
  var lifeLines = getDiagramLifelines(diagram['diagramElements']);
  var orderedMessages = orderDiagramMessages(diagram['diagramElements']);


  //TODO: loop through the orderedMessages and generate the mermaid for each one

  let mer = `sequenceDiagram
              autonumber\n`;
  messages.forEach(function (m) {
    mer += `    ${m.from}->>${m.to}:${m.text}\n`
  })

  console.log(lifeLines)
  console.log(orderedMessages)
}

function generateMermaid(diagrams, messages) {
  
  let mermaid = []
  diagrams.forEach(diagram => {
    if(diagram['diagramType'] == 'InteractionDiagram') {
      mermaid.push(generateInteractionDiagramMermaid(diagram, messages))
    }

  });

  

  return mer;
}


//console.log(lifelines);
//console.log(xmlFragments);

console.log(messages);
console.log(mermaid);

