// SPDX-FileCopyrightText: 2021 Orange SA
// SPDX-License-Identifier: MIT

var AngularCssShrink = require('.');
var fs = require('fs');
var ACS = new AngularCssShrink();
test('extract text between double quote and sigle quote', () => {
  const res = ACS.extractAngularClass(['ceci est un "test"', " ceci est un 'test2'"]);
  expect(res.has('test')).toEqual(true);
  expect(res.has('test2')).toEqual(true);
});

test('extract text with several classes', () => {
  const res = ACS.extractAngularClass(['ceci est un "test test2"']);
  expect(res.has('test')).toEqual(true);
  expect(res.has('test2')).toEqual(true);
});

test('extract classes in real file generated with angular', () => {});
