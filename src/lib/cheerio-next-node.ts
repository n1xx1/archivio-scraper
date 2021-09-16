import {
  AcceptedFilters,
  Cheerio,
  CheerioAPI,
  FilterFunction,
  Node,
} from "cheerio";
import * as select from "cheerio-select";
import { domEach, isCheerio, isTag } from "cheerio/lib/utils";

declare module "cheerio" {
  namespace Custom {
    function prevNodeAll<T extends Node>(this: Cheerio<T>): Cheerio<Node>;

    function nextNode<T extends Node>(this: Cheerio<T>): Cheerio<Node>;
    function nextNodeAll<T extends Node>(this: Cheerio<T>): Cheerio<Node>;
    function nextNodeUntil<T extends Node>(
      this: Cheerio<T>,
      selector?: AcceptedFilters<T>,
    ): Cheerio<Node>;
  }
  type CustomTypes = typeof Custom;
  interface Cheerio<T> extends CustomTypes {}
}

export default function initNextNodePlugin($: CheerioAPI) {
  function getFilterFn<T>(
    match: FilterFunction<T> | Cheerio<T> | T,
  ): (el: T, i: number) => boolean {
    if (typeof match === "function") {
      return (el, i) => (match as FilterFunction<T>).call(el, i, el);
    }
    if (isCheerio<T>(match)) {
      return el => Array.prototype.includes.call(match, el);
    }
    return function (el) {
      return match === el;
    };
  }

  $.prototype.nextNode = function <T extends Node>(
    this: Cheerio<T>,
  ): Cheerio<Node> {
    const elems: Node[] = [];
    for (const e of this) {
      if (e.next) {
        elems.push(e.next);
      }
    }
    return this._make(elems);
  };

  $.prototype.prevNodeAll = function <T extends Node>(
    this: Cheerio<T>,
  ): Cheerio<Node> {
    const matched: Node[] = [];

    domEach(this, elem => {
      for (let prev; (prev = elem.prev); elem = prev) {
        if (!matched.includes(prev)) matched.splice(0, 0, prev);
      }
    });

    return this._make(matched);
  };

  $.prototype.nextNodeAll = function <T extends Node>(
    this: Cheerio<T>,
  ): Cheerio<Node> {
    const matched: Node[] = [];

    domEach(this, elem => {
      for (let next; (next = elem.next); elem = next) {
        if (!matched.includes(next)) matched.push(next);
      }
    });

    return this._make(matched);
  };

  $.prototype.nextNodeUntil = function <T extends Node>(
    this: Cheerio<T>,
    selector?: AcceptedFilters<Node>,
  ): Cheerio<Node> {
    const matched: Node[] = [];
    const selectFn =
      typeof selector === "string"
        ? (elem: Node) =>
            isTag(elem) &&
            select.is(elem, selector, {
              xmlMode: this.options.xmlMode,
              root: this._root?.[0],
            })
        : selector
        ? getFilterFn(selector)
        : null;

    domEach(this, elem => {
      for (let next; (next = elem.next); elem = next) {
        if (selectFn?.(next, matched.length)) break;
        matched.push(next);
      }
    });

    return this._make(matched);
  };
}
