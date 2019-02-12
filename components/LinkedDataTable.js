const Component = require('./Component.js')
const h = require('snabbdom/h').default
const { fetchLinkedObjs } = require('../utils/apiClients')
const objHrefs = require('../utils/objHrefs')
const formatDate = require('../utils/formatDate')
const showIf = require('../utils/showIf')
const typeName = require('../utils/typeName')

module.exports = { LinkedDataTable }

function LinkedDataTable (objKey, type, count) {
  return Component({
    type,
    totalCount: count,
    obj_key: objKey,
    data: [],
    page: 0,
    limit: 20,
    loading: false,
    loadingMore: false,
    fetchInitial () {
      // Fetch the initial set of linked data
      this.loading = true
      this.page = 0
      this._render()
      fetchLinkedObjs(objKey, { type, offset: 0, limit: this.limit })
        .then(resp => {
          this.loading = false
          this.data = null
          this.hasMore = false
          if (resp.results) {
            this.data = resp.results
            if (this.data.length < this.totalCount) {
              this.hasMore = true
            }
          } else if (resp.error) {
            console.error(resp.error)
          }
          this._render()
        })
        .catch(err => {
          console.error(err)
          this.loading = false
          this._render()
        })
    },
    fetchNext () {
      // Fetch the next page of results using an offset
      this.page += 1
      this.loadingMore = true
      this._render()
      const offset = this.page * this.limit
      fetchLinkedObjs(this.obj_key, {
        type: this.type,
        offset,
        limit: this.limit
      })
        .then(resp => {
          if (resp.results) {
            if (resp.results.length === 0) {
              this.hasMore = false
            } else {
              this.data = this.data.concat(resp.results)
            }
            if (this.data.length >= this.totalCount) {
              this.hasMore = false
            }
          } else if (resp.error) {
            console.error(resp.error)
          }
          this.loadingMore = false
          this._render()
        })
        .catch(err => {
          console.error(err)
          this.loadingMore = false
          this._render()
        })
    },
    view
  })
}

function view () {
  if (this.loading) {
    return h('p.muted', 'Loading...')
  }
  if (!this.data || !this.data.length) {
    return h('p.muted', 'No linked data')
  }
  let tableRows = []
  const nCols = 5
  for (let i = 0; i < this.data.length; ++i) {
    const { type_path: typePath, vertex, expanded } = this.data[i]
    let formattedPath = typePath.map(typeName)
    formattedPath[0] += ' (this)'
    formattedPath = formattedPath.join(' 🡒 ')
    const dataRow = h('tr.expandable', {
      class: { expanded },
      on: {
        click: () => {
          this.data[i].expanded = !this.data[i].expanded
          this._render()
        }
      }
    }, [
      h('td', [ h('span.expand-icon', expanded ? '−' : '+') ]),
      h('td', [
        vertex.obj_name
        // h('a', { props: { href: hrefs.obj } }, vertex.obj_name)
      ]),
      h('td', formatDate(vertex.save_date)),
      h('td', [
        vertex.owner
        // h('a', { props: { href: hrefs.owner } }, vertex.owner)
      ]),
      h('td', [
        vertex.narr_name
        // h('a', { props: { href: hrefs.narrative } }, vertex.narr_name)
      ])
    ])
    const hrefs = objHrefs(vertex)
    const detailsRow = h('tr.expandable-sibling', {
      class: {
        'expanded-sibling': expanded
      }
    }, [
      h('td', { props: { colSpan: nCols } }, [
        h('div.p1', {
          style: {
            overflow: 'auto',
            whiteSpace: 'normal'
          }
        }, [
          h('p.m0.py1.border-bottom.light-border', [
            h('span.bold.color-devil', 'Object'),
            h('a.inline-block.right.text-ellipsis.mw-36rem', {
              props: {
                href: hrefs.obj,
                target: '_blank'
              }
            }, vertex.obj_name)
          ]),
          h('p.m0.py1.border-bottom.light-border', [
            h('span.bold.color-devil', 'Saved'),
            h('span.inline-block.right.text-ellipsis.mw-36rem', vertex.save_date)
          ]),
          h('p.m0.py1.border-bottom.light-border', [
            h('span.bold.color-devil', 'Type'),
            h('a.inline-block.right.text-ellipsis.mw-36rem', {
              props: {
                href: hrefs.type,
                target: '_blank'
              }
            }, vertex.ws_type)
          ]),
          h('p.m0.py1.border-bottom.light-border', [
            h('span.bold.color-devil', 'Narrative'),
            h('a.inline-block.right.text-ellipsis.mw-36rem', {
              props: {
                href: hrefs.narrative,
                target: '_blank'
              }
            }, vertex.narr_name)
          ]),
          h('p.m0.py1', [
            h('span.bold.color-devil', 'Path to object'),
            h('span.inline-block.right.text-ellipsis.mw-36rem', formattedPath)
          ])
        ])
      ])
    ])

    tableRows.push(dataRow)
    tableRows.push(detailsRow)
  }
  return h('div', [
    h('table.table-lined', [
      h('thead', [
        h('tr', [
          h('th', ''),
          h('th', 'Name'),
          h('th', 'Date'),
          h('th', 'Creator'),
          h('th', 'Narrative')
        ])
      ]),
      h('tbody', tableRows)
    ]),
    showIf(this.hasMore, () =>
      h('div', [
        h('button.btn.mt2', {
          on: { click: () => this.fetchNext() },
          props: {disabled: this.loadingMore}
        }, [
          showIf(this.loadingMore, 'Loading...'),
          showIf(!this.loadingMore, `Load more`)
        ]),
        h('span.muted.inline-block.ml1', [this.totalCount - this.data.length, ' left'])
      ])
    ),
    showIf(!this.hasMore, () => h('p.muted', 'No more results'))
  ])
}
