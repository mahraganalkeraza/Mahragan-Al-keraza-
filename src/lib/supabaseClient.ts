import { createClient } from '@supabase/supabase-js';

// Use standard environment variable access for cross-environment compatibility
const supabaseUrl = typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: any = null;

if (supabaseUrl && supabaseUrl.startsWith('http')) {
  client = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("⚠️ Supabase Client is falling back to LocalStorage Mock because environment variable credentials are not set.");
  
  class MockBuilder {
    private tableName: string;
    private filterField: string | null = null;
    private filterOp: 'eq' | 'neq' | null = null;
    private filterVal: any = null;

    constructor(tableName: string) {
      this.tableName = tableName;
    }

    select(columns: string = '*', options?: any) {
      const exec = () => {
        const data = this.getData();
        if (columns === 'count' && options?.count === 'exact') {
          return { data: null, count: data.length, error: null };
        }
        return { data, error: null };
      };

      const result: any = {
        then: (onfulfilled: any) => {
          return Promise.resolve(exec()).then(onfulfilled);
        },
        maybeSingle: () => {
          return Promise.resolve({ data: this.getData()[0] || null, error: null });
        },
        single: () => {
          const d = this.getData();
          return Promise.resolve({ data: d[0] || null, error: d[0] ? null : new Error("No rows found") });
        },
        eq: (col: string, val: any) => {
          this.filterField = col;
          this.filterOp = 'eq';
          this.filterVal = val;
          return result;
        },
        neq: (col: string, val: any) => {
          this.filterField = col;
          this.filterOp = 'neq';
          this.filterVal = val;
          return result;
        }
      };
      return result;
    }

    insert(payload: any) {
      const exec = () => {
        const current = this.getDataRaw();
        const items = Array.isArray(payload) ? payload : [payload];
        const newItems = items.map((item, idx) => {
          return {
            id: item.id || String(Date.now() + Math.floor(Math.random() * 100000) + idx),
            ...item,
            created_at: item.created_at || new Date().toISOString()
          };
        });
        const updated = [...current, ...newItems];
        this.saveDataRaw(updated);
        return { data: newItems, error: null };
      };

      const result: any = {
        then: (onfulfilled: any) => {
          return Promise.resolve(exec()).then(onfulfilled);
        },
        select: () => {
          return {
            maybeSingle: () => {
              const current = this.getDataRaw();
              const lastItem = current[current.length - 1] || null;
              return Promise.resolve({ data: lastItem, error: null });
            },
            then: (onfulfilled: any) => {
              const current = this.getDataRaw();
              const lastItem = current[current.length - 1] || null;
              return Promise.resolve({ data: lastItem ? [lastItem] : [], error: null }).then(onfulfilled);
            }
          };
        }
      };
      return result;
    }

    update(updatePayload: any) {
      const result: any = {
        eq: (col: string, val: any) => {
          this.filterField = col;
          this.filterOp = 'eq';
          this.filterVal = val;
          
          return {
            then: (onfulfilled: any) => {
              const current = this.getDataRaw();
              const updatedItems: any[] = [];
              const updated = current.map(item => {
                let match = false;
                if (this.filterField) {
                  const itemVal = item[this.filterField];
                  match = String(itemVal) === String(this.filterVal);
                }
                if (match) {
                  const updatedItem = { ...item, ...updatePayload };
                  updatedItems.push(updatedItem);
                  return updatedItem;
                }
                return item;
              });
              this.saveDataRaw(updated);
              return Promise.resolve({ data: updatedItems, error: null }).then(onfulfilled);
            }
          };
        }
      };
      return result;
    }

    delete() {
      const result: any = {
        eq: (col: string, val: any) => {
          this.filterField = col;
          this.filterOp = 'eq';
          this.filterVal = val;
          
          return {
            then: (onfulfilled: any) => {
              const current = this.getDataRaw();
              const remaining = current.filter(item => {
                if (this.filterField) {
                  const itemVal = item[this.filterField];
                  return String(itemVal) !== String(this.filterVal);
                }
                return true;
              });
              this.saveDataRaw(remaining);
              return Promise.resolve({ data: [], error: null }).then(onfulfilled);
            }
          };
        },
        neq: (col: string, val: any) => {
          this.filterField = col;
          this.filterOp = 'neq';
          this.filterVal = val;
          
          return {
            then: (onfulfilled: any) => {
              const current = this.getDataRaw();
              const remaining = current.filter(item => {
                if (this.filterField) {
                  const itemVal = item[this.filterField];
                  return String(itemVal) === String(this.filterVal);
                }
                return true;
              });
              this.saveDataRaw(remaining);
              return Promise.resolve({ data: [], error: null }).then(onfulfilled);
            }
          };
        }
      };
      return result;
    }

    private getDataRaw(): any[] {
      const key = `mock_supabase_${this.tableName}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      }
      return [];
    }

    private saveDataRaw(data: any[]) {
      const key = `mock_supabase_${this.tableName}`;
      localStorage.setItem(key, JSON.stringify(data));
    }

    private getData(): any[] {
      let data = this.getDataRaw();
      if (this.filterField && this.filterOp && this.filterVal !== null) {
        data = data.filter(item => {
          const itemVal = item[this.filterField!];
          if (this.filterOp === 'eq') {
            return String(itemVal) === String(this.filterVal);
          } else {
            return String(itemVal) !== String(this.filterVal);
          }
        });
      }
      return data;
    }
  }

  client = {
    from: (tableName: string) => {
      return new MockBuilder(tableName);
    }
  };
}

export const supabase = client;
