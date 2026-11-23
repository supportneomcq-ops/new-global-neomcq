import { describe, expect, it } from 'bun:test'
import { buildCurriculumDiff, validateStructuredSyllabus } from '../curriculum-diff'

const spec = [{
  name:'Medicine',
  topics:[{
    name:'Cardiology',
    subtopics:[{name:'Heart Failure'},{name:'Arrhythmias'}],
  }],
}]

const complete = [{
  id:'s1',name:'Medicine',is_active:true,
  exam_topics:[{
    id:'t1',name:'Cardiology',is_active:true,
    exam_subtopics:[
      {id:'st1',name:'Heart Failure',is_active:true},
      {id:'st2',name:'Arrhythmias',is_active:true},
    ],
  }],
}]

describe('versioned official curriculum reconciliation',()=>{
  it('reports exact hierarchy coverage without mutation issues',()=>{
    const report=buildCurriculumDiff(spec,complete)
    expect(report.coveragePercentage).toBe(100)
    expect(report.expected).toEqual({subjects:1,topics:1,subtopics:2,total:4})
    expect(report.matched.total).toBe(4)
    expect(report.blockingIssueCount).toBe(0)
    expect(report.canApplyMissing).toBe(true)
  })

  it('detects missing nodes as additions',()=>{
    const report=buildCurriculumDiff(spec,[])
    expect(report.additions.map((item)=>item.level)).toEqual(['subject','topic','subtopic','subtopic'])
    expect(report.coveragePercentage).toBe(0)
    expect(report.canApplyMissing).toBe(true)
  })

  it('reports removed-from-current-syllabus nodes but never treats them as deletions',()=>{
    const report=buildCurriculumDiff(spec,[{
      ...complete[0],
      exam_topics:[...complete[0].exam_topics,{id:'t2',name:'Legacy topic',is_active:true,exam_subtopics:[]}],
    }])
    expect(report.notInCurrentSyllabus.some((item)=>item.name==='Legacy topic')).toBe(true)
    expect(report.issues.some((item)=>item.type==='not_in_current_syllabus')).toBe(true)
  })

  it('blocks automatic application when duplicate persisted nodes exist',()=>{
    const report=buildCurriculumDiff(spec,[{
      ...complete[0],
      exam_topics:[...complete[0].exam_topics,{...complete[0].exam_topics[0],id:'t-duplicate'}],
    }])
    expect(report.duplicates.length).toBeGreaterThan(0)
    expect(report.blockingIssueCount).toBeGreaterThan(0)
    expect(report.canApplyMissing).toBe(false)
  })

  it('flags likely renamed nodes for manual review rather than merging or inserting',()=>{
    const report=buildCurriculumDiff([{name:'Medicine',topics:[{name:'Cardiology',subtopics:[{name:'Heart Failure'}]}]}],[{
      id:'s1',name:'Medicine',is_active:true,
      exam_topics:[{id:'t1',name:'Cardiologic',is_active:true,exam_subtopics:[]}],
    }])
    expect(report.uncertain.length + report.renamedCandidates.length).toBeGreaterThan(0)
    expect(report.canApplyMissing).toBe(false)
  })
  it('blocks duplicate names in the official syllabus at topic and subtopic levels',()=>{
    const duplicateSpec=[{
      name:'Medicine',
      topics:[
        {name:'Cardiology',subtopics:[{name:'Heart Failure'},{name:'Heart Failure'}]},
        {name:'Cardiology',subtopics:[{name:'Arrhythmias'}]},
      ],
    }]
    const report=buildCurriculumDiff(duplicateSpec,[])
    expect(report.duplicates.some((item)=>item.level==='topic')).toBe(true)
    expect(report.duplicates.some((item)=>item.level==='subtopic')).toBe(true)
    expect(report.canApplyMissing).toBe(false)
  })

  it('rejects incomplete or generic official hierarchy instead of inventing subtopics',()=>{
    const result=validateStructuredSyllabus([{name:'Medicine',topics:[{name:'Cardiology',subtopics:[]}]}])
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(validateStructuredSyllabus([{name:'Subject 1',topics:[{name:'Topic 1',subtopics:[{name:'Subtopic 1'}]}]}]).valid).toBe(false)
  })

  it('flags modified official descriptions and weightage for manual review',()=>{
    const expected=[{name:'Medicine',description:'Updated description',weightage:20,topics:[{name:'Cardiology',description:'New scope',subtopics:[{name:'Heart Failure',description:'Updated detail'}]}]}]
    const existing=[{id:'s1',name:'Medicine',description:'Old description',weight_percentage:10,is_active:true,exam_topics:[{id:'t1',name:'Cardiology',description:'Old scope',is_active:true,exam_subtopics:[{id:'st1',name:'Heart Failure',description:'Old detail',is_active:true}]}]}]
    const report=buildCurriculumDiff(expected,existing)
    expect(report.modified.length).toBe(3)
    expect(report.canApplyMissing).toBe(false)
  })

})
