// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'expense_request.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$RefItem {

 int get id; String? get code; String? get name;
/// Create a copy of RefItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RefItemCopyWith<RefItem> get copyWith => _$RefItemCopyWithImpl<RefItem>(this as RefItem, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as RefItem;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RefItem&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.code, _this.code) || other.code == _this.code)&&(identical(other.name, _this.name) || other.name == _this.name));
}


@override
int get hashCode {
  final _this = this as RefItem;
  return Object.hash(runtimeType,_this.id,_this.code,_this.name);
}

@override
String toString() {
  final _this = this as RefItem;
  return 'RefItem(id: ${_this.id}, code: ${_this.code}, name: ${_this.name})';
}


}

/// @nodoc
abstract mixin class $RefItemCopyWith<$Res>  {
  factory $RefItemCopyWith(RefItem value, $Res Function(RefItem) _then) = _$RefItemCopyWithImpl;
@useResult
$Res call({
 int id, String? code, String? name
});




}
/// @nodoc
class _$RefItemCopyWithImpl<$Res>
    implements $RefItemCopyWith<$Res> {
  _$RefItemCopyWithImpl(this._self, this._then);

  final RefItem _self;
  final $Res Function(RefItem) _then;

/// Create a copy of RefItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = freezed,Object? name = freezed,}) {
  return _then(RefItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RefItem].
extension RefItemPatterns on RefItem {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RefItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RefItem() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RefItem value)  $default,){
final _that = this;
switch (_that) {
case _RefItem():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RefItem value)?  $default,){
final _that = this;
switch (_that) {
case _RefItem() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String? code,  String? name)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RefItem() when $default != null:
return $default(_that.id,_that.code,_that.name);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String? code,  String? name)  $default,) {final _that = this;
switch (_that) {
case _RefItem():
return $default(_that.id,_that.code,_that.name);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String? code,  String? name)?  $default,) {final _that = this;
switch (_that) {
case _RefItem() when $default != null:
return $default(_that.id,_that.code,_that.name);case _:
  return null;

}
}

}

/// @nodoc


class _RefItem implements RefItem {
  const _RefItem({required this.id, this.code, this.name});
  

@override final  int id;
@override final  String? code;
@override final  String? name;

/// Create a copy of RefItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RefItemCopyWith<_RefItem> get copyWith => __$RefItemCopyWithImpl<_RefItem>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RefItem&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.name, name) || other.name == name));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,code,name);
}

@override
String toString() {
    return 'RefItem(id: $id, code: $code, name: $name)';
}


}

/// @nodoc
abstract mixin class _$RefItemCopyWith<$Res> implements $RefItemCopyWith<$Res> {
  factory _$RefItemCopyWith(_RefItem value, $Res Function(_RefItem) _then) = __$RefItemCopyWithImpl;
@override @useResult
$Res call({
 int id, String? code, String? name
});




}
/// @nodoc
class __$RefItemCopyWithImpl<$Res>
    implements _$RefItemCopyWith<$Res> {
  __$RefItemCopyWithImpl(this._self, this._then);

  final _RefItem _self;
  final $Res Function(_RefItem) _then;

/// Create a copy of RefItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = freezed,Object? name = freezed,}) {
  return _then(_RefItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

/// @nodoc
mixin _$ExpenseSummary {

 int get id; String? get docNo; RequestType get type; String get typeLabel; RequestStatus get status; String get statusLabel; String get title; int get grandTotal; int? get approvedAmount; String? get requestDate; String? get neededDate; String? get updatedAt; int get openWarningFlags;
/// Create a copy of ExpenseSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExpenseSummaryCopyWith<ExpenseSummary> get copyWith => _$ExpenseSummaryCopyWithImpl<ExpenseSummary>(this as ExpenseSummary, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ExpenseSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExpenseSummary&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.docNo, _this.docNo) || other.docNo == _this.docNo)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.typeLabel, _this.typeLabel) || other.typeLabel == _this.typeLabel)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.statusLabel, _this.statusLabel) || other.statusLabel == _this.statusLabel)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.grandTotal, _this.grandTotal) || other.grandTotal == _this.grandTotal)&&(identical(other.approvedAmount, _this.approvedAmount) || other.approvedAmount == _this.approvedAmount)&&(identical(other.requestDate, _this.requestDate) || other.requestDate == _this.requestDate)&&(identical(other.neededDate, _this.neededDate) || other.neededDate == _this.neededDate)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt)&&(identical(other.openWarningFlags, _this.openWarningFlags) || other.openWarningFlags == _this.openWarningFlags));
}


@override
int get hashCode {
  final _this = this as ExpenseSummary;
  return Object.hash(runtimeType,_this.id,_this.docNo,_this.type,_this.typeLabel,_this.status,_this.statusLabel,_this.title,_this.grandTotal,_this.approvedAmount,_this.requestDate,_this.neededDate,_this.updatedAt,_this.openWarningFlags);
}

@override
String toString() {
  final _this = this as ExpenseSummary;
  return 'ExpenseSummary(id: ${_this.id}, docNo: ${_this.docNo}, type: ${_this.type}, typeLabel: ${_this.typeLabel}, status: ${_this.status}, statusLabel: ${_this.statusLabel}, title: ${_this.title}, grandTotal: ${_this.grandTotal}, approvedAmount: ${_this.approvedAmount}, requestDate: ${_this.requestDate}, neededDate: ${_this.neededDate}, updatedAt: ${_this.updatedAt}, openWarningFlags: ${_this.openWarningFlags})';
}


}

/// @nodoc
abstract mixin class $ExpenseSummaryCopyWith<$Res>  {
  factory $ExpenseSummaryCopyWith(ExpenseSummary value, $Res Function(ExpenseSummary) _then) = _$ExpenseSummaryCopyWithImpl;
@useResult
$Res call({
 int id, String? docNo, RequestType type, String typeLabel, RequestStatus status, String statusLabel, String title, int grandTotal, int? approvedAmount, String? requestDate, String? neededDate, String? updatedAt, int openWarningFlags
});




}
/// @nodoc
class _$ExpenseSummaryCopyWithImpl<$Res>
    implements $ExpenseSummaryCopyWith<$Res> {
  _$ExpenseSummaryCopyWithImpl(this._self, this._then);

  final ExpenseSummary _self;
  final $Res Function(ExpenseSummary) _then;

/// Create a copy of ExpenseSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? docNo = freezed,Object? type = null,Object? typeLabel = null,Object? status = null,Object? statusLabel = null,Object? title = null,Object? grandTotal = null,Object? approvedAmount = freezed,Object? requestDate = freezed,Object? neededDate = freezed,Object? updatedAt = freezed,Object? openWarningFlags = null,}) {
  return _then(ExpenseSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,docNo: freezed == docNo ? _self.docNo : docNo // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as RequestType,typeLabel: null == typeLabel ? _self.typeLabel : typeLabel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RequestStatus,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,grandTotal: null == grandTotal ? _self.grandTotal : grandTotal // ignore: cast_nullable_to_non_nullable
as int,approvedAmount: freezed == approvedAmount ? _self.approvedAmount : approvedAmount // ignore: cast_nullable_to_non_nullable
as int?,requestDate: freezed == requestDate ? _self.requestDate : requestDate // ignore: cast_nullable_to_non_nullable
as String?,neededDate: freezed == neededDate ? _self.neededDate : neededDate // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,openWarningFlags: null == openWarningFlags ? _self.openWarningFlags : openWarningFlags // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ExpenseSummary].
extension ExpenseSummaryPatterns on ExpenseSummary {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExpenseSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExpenseSummary() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExpenseSummary value)  $default,){
final _that = this;
switch (_that) {
case _ExpenseSummary():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExpenseSummary value)?  $default,){
final _that = this;
switch (_that) {
case _ExpenseSummary() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String? docNo,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  int grandTotal,  int? approvedAmount,  String? requestDate,  String? neededDate,  String? updatedAt,  int openWarningFlags)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExpenseSummary() when $default != null:
return $default(_that.id,_that.docNo,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.grandTotal,_that.approvedAmount,_that.requestDate,_that.neededDate,_that.updatedAt,_that.openWarningFlags);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String? docNo,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  int grandTotal,  int? approvedAmount,  String? requestDate,  String? neededDate,  String? updatedAt,  int openWarningFlags)  $default,) {final _that = this;
switch (_that) {
case _ExpenseSummary():
return $default(_that.id,_that.docNo,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.grandTotal,_that.approvedAmount,_that.requestDate,_that.neededDate,_that.updatedAt,_that.openWarningFlags);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String? docNo,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  int grandTotal,  int? approvedAmount,  String? requestDate,  String? neededDate,  String? updatedAt,  int openWarningFlags)?  $default,) {final _that = this;
switch (_that) {
case _ExpenseSummary() when $default != null:
return $default(_that.id,_that.docNo,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.grandTotal,_that.approvedAmount,_that.requestDate,_that.neededDate,_that.updatedAt,_that.openWarningFlags);case _:
  return null;

}
}

}

/// @nodoc


class _ExpenseSummary implements ExpenseSummary {
  const _ExpenseSummary({required this.id, this.docNo, required this.type, required this.typeLabel, required this.status, required this.statusLabel, required this.title, required this.grandTotal, this.approvedAmount, this.requestDate, this.neededDate, this.updatedAt, this.openWarningFlags = 0});
  

@override final  int id;
@override final  String? docNo;
@override final  RequestType type;
@override final  String typeLabel;
@override final  RequestStatus status;
@override final  String statusLabel;
@override final  String title;
@override final  int grandTotal;
@override final  int? approvedAmount;
@override final  String? requestDate;
@override final  String? neededDate;
@override final  String? updatedAt;
@override@JsonKey() final  int openWarningFlags;

/// Create a copy of ExpenseSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExpenseSummaryCopyWith<_ExpenseSummary> get copyWith => __$ExpenseSummaryCopyWithImpl<_ExpenseSummary>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExpenseSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.docNo, docNo) || other.docNo == docNo)&&(identical(other.type, type) || other.type == type)&&(identical(other.typeLabel, typeLabel) || other.typeLabel == typeLabel)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.title, title) || other.title == title)&&(identical(other.grandTotal, grandTotal) || other.grandTotal == grandTotal)&&(identical(other.approvedAmount, approvedAmount) || other.approvedAmount == approvedAmount)&&(identical(other.requestDate, requestDate) || other.requestDate == requestDate)&&(identical(other.neededDate, neededDate) || other.neededDate == neededDate)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.openWarningFlags, openWarningFlags) || other.openWarningFlags == openWarningFlags));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,docNo,type,typeLabel,status,statusLabel,title,grandTotal,approvedAmount,requestDate,neededDate,updatedAt,openWarningFlags);
}

@override
String toString() {
    return 'ExpenseSummary(id: $id, docNo: $docNo, type: $type, typeLabel: $typeLabel, status: $status, statusLabel: $statusLabel, title: $title, grandTotal: $grandTotal, approvedAmount: $approvedAmount, requestDate: $requestDate, neededDate: $neededDate, updatedAt: $updatedAt, openWarningFlags: $openWarningFlags)';
}


}

/// @nodoc
abstract mixin class _$ExpenseSummaryCopyWith<$Res> implements $ExpenseSummaryCopyWith<$Res> {
  factory _$ExpenseSummaryCopyWith(_ExpenseSummary value, $Res Function(_ExpenseSummary) _then) = __$ExpenseSummaryCopyWithImpl;
@override @useResult
$Res call({
 int id, String? docNo, RequestType type, String typeLabel, RequestStatus status, String statusLabel, String title, int grandTotal, int? approvedAmount, String? requestDate, String? neededDate, String? updatedAt, int openWarningFlags
});




}
/// @nodoc
class __$ExpenseSummaryCopyWithImpl<$Res>
    implements _$ExpenseSummaryCopyWith<$Res> {
  __$ExpenseSummaryCopyWithImpl(this._self, this._then);

  final _ExpenseSummary _self;
  final $Res Function(_ExpenseSummary) _then;

/// Create a copy of ExpenseSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? docNo = freezed,Object? type = null,Object? typeLabel = null,Object? status = null,Object? statusLabel = null,Object? title = null,Object? grandTotal = null,Object? approvedAmount = freezed,Object? requestDate = freezed,Object? neededDate = freezed,Object? updatedAt = freezed,Object? openWarningFlags = null,}) {
  return _then(_ExpenseSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,docNo: freezed == docNo ? _self.docNo : docNo // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as RequestType,typeLabel: null == typeLabel ? _self.typeLabel : typeLabel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RequestStatus,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,grandTotal: null == grandTotal ? _self.grandTotal : grandTotal // ignore: cast_nullable_to_non_nullable
as int,approvedAmount: freezed == approvedAmount ? _self.approvedAmount : approvedAmount // ignore: cast_nullable_to_non_nullable
as int?,requestDate: freezed == requestDate ? _self.requestDate : requestDate // ignore: cast_nullable_to_non_nullable
as String?,neededDate: freezed == neededDate ? _self.neededDate : neededDate // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,openWarningFlags: null == openWarningFlags ? _self.openWarningFlags : openWarningFlags // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc
mixin _$ExpenseLine {

 String get id; int get no; String? get description; double? get qty; RefItem? get uom; int? get unitPrice; int? get unitPriceDisplay; int get total; String? get notes; RefItem? get category; String? get vehiclePlate;
/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExpenseLineCopyWith<ExpenseLine> get copyWith => _$ExpenseLineCopyWithImpl<ExpenseLine>(this as ExpenseLine, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ExpenseLine;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExpenseLine&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.no, _this.no) || other.no == _this.no)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.qty, _this.qty) || other.qty == _this.qty)&&(identical(other.uom, _this.uom) || other.uom == _this.uom)&&(identical(other.unitPrice, _this.unitPrice) || other.unitPrice == _this.unitPrice)&&(identical(other.unitPriceDisplay, _this.unitPriceDisplay) || other.unitPriceDisplay == _this.unitPriceDisplay)&&(identical(other.total, _this.total) || other.total == _this.total)&&(identical(other.notes, _this.notes) || other.notes == _this.notes)&&(identical(other.category, _this.category) || other.category == _this.category)&&(identical(other.vehiclePlate, _this.vehiclePlate) || other.vehiclePlate == _this.vehiclePlate));
}


@override
int get hashCode {
  final _this = this as ExpenseLine;
  return Object.hash(runtimeType,_this.id,_this.no,_this.description,_this.qty,_this.uom,_this.unitPrice,_this.unitPriceDisplay,_this.total,_this.notes,_this.category,_this.vehiclePlate);
}

@override
String toString() {
  final _this = this as ExpenseLine;
  return 'ExpenseLine(id: ${_this.id}, no: ${_this.no}, description: ${_this.description}, qty: ${_this.qty}, uom: ${_this.uom}, unitPrice: ${_this.unitPrice}, unitPriceDisplay: ${_this.unitPriceDisplay}, total: ${_this.total}, notes: ${_this.notes}, category: ${_this.category}, vehiclePlate: ${_this.vehiclePlate})';
}


}

/// @nodoc
abstract mixin class $ExpenseLineCopyWith<$Res>  {
  factory $ExpenseLineCopyWith(ExpenseLine value, $Res Function(ExpenseLine) _then) = _$ExpenseLineCopyWithImpl;
@useResult
$Res call({
 String id, int no, String? description, double? qty, RefItem? uom, int? unitPrice, int? unitPriceDisplay, int total, String? notes, RefItem? category, String? vehiclePlate
});


$RefItemCopyWith<$Res>? get uom;$RefItemCopyWith<$Res>? get category;

}
/// @nodoc
class _$ExpenseLineCopyWithImpl<$Res>
    implements $ExpenseLineCopyWith<$Res> {
  _$ExpenseLineCopyWithImpl(this._self, this._then);

  final ExpenseLine _self;
  final $Res Function(ExpenseLine) _then;

/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? no = null,Object? description = freezed,Object? qty = freezed,Object? uom = freezed,Object? unitPrice = freezed,Object? unitPriceDisplay = freezed,Object? total = null,Object? notes = freezed,Object? category = freezed,Object? vehiclePlate = freezed,}) {
  return _then(ExpenseLine(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,no: null == no ? _self.no : no // ignore: cast_nullable_to_non_nullable
as int,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,qty: freezed == qty ? _self.qty : qty // ignore: cast_nullable_to_non_nullable
as double?,uom: freezed == uom ? _self.uom : uom // ignore: cast_nullable_to_non_nullable
as RefItem?,unitPrice: freezed == unitPrice ? _self.unitPrice : unitPrice // ignore: cast_nullable_to_non_nullable
as int?,unitPriceDisplay: freezed == unitPriceDisplay ? _self.unitPriceDisplay : unitPriceDisplay // ignore: cast_nullable_to_non_nullable
as int?,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as RefItem?,vehiclePlate: freezed == vehiclePlate ? _self.vehiclePlate : vehiclePlate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get uom {
    if (_self.uom == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.uom!, (value) {
    return _then(_self.copyWith(uom: value));
  });
}/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get category {
    if (_self.category == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.category!, (value) {
    return _then(_self.copyWith(category: value));
  });
}
}


/// Adds pattern-matching-related methods to [ExpenseLine].
extension ExpenseLinePatterns on ExpenseLine {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExpenseLine value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExpenseLine() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExpenseLine value)  $default,){
final _that = this;
switch (_that) {
case _ExpenseLine():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExpenseLine value)?  $default,){
final _that = this;
switch (_that) {
case _ExpenseLine() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  int no,  String? description,  double? qty,  RefItem? uom,  int? unitPrice,  int? unitPriceDisplay,  int total,  String? notes,  RefItem? category,  String? vehiclePlate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExpenseLine() when $default != null:
return $default(_that.id,_that.no,_that.description,_that.qty,_that.uom,_that.unitPrice,_that.unitPriceDisplay,_that.total,_that.notes,_that.category,_that.vehiclePlate);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  int no,  String? description,  double? qty,  RefItem? uom,  int? unitPrice,  int? unitPriceDisplay,  int total,  String? notes,  RefItem? category,  String? vehiclePlate)  $default,) {final _that = this;
switch (_that) {
case _ExpenseLine():
return $default(_that.id,_that.no,_that.description,_that.qty,_that.uom,_that.unitPrice,_that.unitPriceDisplay,_that.total,_that.notes,_that.category,_that.vehiclePlate);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  int no,  String? description,  double? qty,  RefItem? uom,  int? unitPrice,  int? unitPriceDisplay,  int total,  String? notes,  RefItem? category,  String? vehiclePlate)?  $default,) {final _that = this;
switch (_that) {
case _ExpenseLine() when $default != null:
return $default(_that.id,_that.no,_that.description,_that.qty,_that.uom,_that.unitPrice,_that.unitPriceDisplay,_that.total,_that.notes,_that.category,_that.vehiclePlate);case _:
  return null;

}
}

}

/// @nodoc


class _ExpenseLine implements ExpenseLine {
  const _ExpenseLine({required this.id, required this.no, this.description, this.qty, this.uom, this.unitPrice, this.unitPriceDisplay, required this.total, this.notes, this.category, this.vehiclePlate});
  

@override final  String id;
@override final  int no;
@override final  String? description;
@override final  double? qty;
@override final  RefItem? uom;
@override final  int? unitPrice;
@override final  int? unitPriceDisplay;
@override final  int total;
@override final  String? notes;
@override final  RefItem? category;
@override final  String? vehiclePlate;

/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExpenseLineCopyWith<_ExpenseLine> get copyWith => __$ExpenseLineCopyWithImpl<_ExpenseLine>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExpenseLine&&(identical(other.id, id) || other.id == id)&&(identical(other.no, no) || other.no == no)&&(identical(other.description, description) || other.description == description)&&(identical(other.qty, qty) || other.qty == qty)&&(identical(other.uom, uom) || other.uom == uom)&&(identical(other.unitPrice, unitPrice) || other.unitPrice == unitPrice)&&(identical(other.unitPriceDisplay, unitPriceDisplay) || other.unitPriceDisplay == unitPriceDisplay)&&(identical(other.total, total) || other.total == total)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.category, category) || other.category == category)&&(identical(other.vehiclePlate, vehiclePlate) || other.vehiclePlate == vehiclePlate));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,no,description,qty,uom,unitPrice,unitPriceDisplay,total,notes,category,vehiclePlate);
}

@override
String toString() {
    return 'ExpenseLine(id: $id, no: $no, description: $description, qty: $qty, uom: $uom, unitPrice: $unitPrice, unitPriceDisplay: $unitPriceDisplay, total: $total, notes: $notes, category: $category, vehiclePlate: $vehiclePlate)';
}


}

/// @nodoc
abstract mixin class _$ExpenseLineCopyWith<$Res> implements $ExpenseLineCopyWith<$Res> {
  factory _$ExpenseLineCopyWith(_ExpenseLine value, $Res Function(_ExpenseLine) _then) = __$ExpenseLineCopyWithImpl;
@override @useResult
$Res call({
 String id, int no, String? description, double? qty, RefItem? uom, int? unitPrice, int? unitPriceDisplay, int total, String? notes, RefItem? category, String? vehiclePlate
});


@override $RefItemCopyWith<$Res>? get uom;@override $RefItemCopyWith<$Res>? get category;

}
/// @nodoc
class __$ExpenseLineCopyWithImpl<$Res>
    implements _$ExpenseLineCopyWith<$Res> {
  __$ExpenseLineCopyWithImpl(this._self, this._then);

  final _ExpenseLine _self;
  final $Res Function(_ExpenseLine) _then;

/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? no = null,Object? description = freezed,Object? qty = freezed,Object? uom = freezed,Object? unitPrice = freezed,Object? unitPriceDisplay = freezed,Object? total = null,Object? notes = freezed,Object? category = freezed,Object? vehiclePlate = freezed,}) {
  return _then(_ExpenseLine(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,no: null == no ? _self.no : no // ignore: cast_nullable_to_non_nullable
as int,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,qty: freezed == qty ? _self.qty : qty // ignore: cast_nullable_to_non_nullable
as double?,uom: freezed == uom ? _self.uom : uom // ignore: cast_nullable_to_non_nullable
as RefItem?,unitPrice: freezed == unitPrice ? _self.unitPrice : unitPrice // ignore: cast_nullable_to_non_nullable
as int?,unitPriceDisplay: freezed == unitPriceDisplay ? _self.unitPriceDisplay : unitPriceDisplay // ignore: cast_nullable_to_non_nullable
as int?,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as RefItem?,vehiclePlate: freezed == vehiclePlate ? _self.vehiclePlate : vehiclePlate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get uom {
    if (_self.uom == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.uom!, (value) {
    return _then(_self.copyWith(uom: value));
  });
}/// Create a copy of ExpenseLine
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get category {
    if (_self.category == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.category!, (value) {
    return _then(_self.copyWith(category: value));
  });
}
}

/// @nodoc
mixin _$ReceiptInfo {

 int get id; String get lineId; int? get lineNo; String? get receiptNo; String get vendorName; String get receiptDate; int get amount; int? get imageId; String get status;
/// Create a copy of ReceiptInfo
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReceiptInfoCopyWith<ReceiptInfo> get copyWith => _$ReceiptInfoCopyWithImpl<ReceiptInfo>(this as ReceiptInfo, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ReceiptInfo;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReceiptInfo&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.lineId, _this.lineId) || other.lineId == _this.lineId)&&(identical(other.lineNo, _this.lineNo) || other.lineNo == _this.lineNo)&&(identical(other.receiptNo, _this.receiptNo) || other.receiptNo == _this.receiptNo)&&(identical(other.vendorName, _this.vendorName) || other.vendorName == _this.vendorName)&&(identical(other.receiptDate, _this.receiptDate) || other.receiptDate == _this.receiptDate)&&(identical(other.amount, _this.amount) || other.amount == _this.amount)&&(identical(other.imageId, _this.imageId) || other.imageId == _this.imageId)&&(identical(other.status, _this.status) || other.status == _this.status));
}


@override
int get hashCode {
  final _this = this as ReceiptInfo;
  return Object.hash(runtimeType,_this.id,_this.lineId,_this.lineNo,_this.receiptNo,_this.vendorName,_this.receiptDate,_this.amount,_this.imageId,_this.status);
}

@override
String toString() {
  final _this = this as ReceiptInfo;
  return 'ReceiptInfo(id: ${_this.id}, lineId: ${_this.lineId}, lineNo: ${_this.lineNo}, receiptNo: ${_this.receiptNo}, vendorName: ${_this.vendorName}, receiptDate: ${_this.receiptDate}, amount: ${_this.amount}, imageId: ${_this.imageId}, status: ${_this.status})';
}


}

/// @nodoc
abstract mixin class $ReceiptInfoCopyWith<$Res>  {
  factory $ReceiptInfoCopyWith(ReceiptInfo value, $Res Function(ReceiptInfo) _then) = _$ReceiptInfoCopyWithImpl;
@useResult
$Res call({
 int id, String lineId, int? lineNo, String? receiptNo, String vendorName, String receiptDate, int amount, int? imageId, String status
});




}
/// @nodoc
class _$ReceiptInfoCopyWithImpl<$Res>
    implements $ReceiptInfoCopyWith<$Res> {
  _$ReceiptInfoCopyWithImpl(this._self, this._then);

  final ReceiptInfo _self;
  final $Res Function(ReceiptInfo) _then;

/// Create a copy of ReceiptInfo
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? lineId = null,Object? lineNo = freezed,Object? receiptNo = freezed,Object? vendorName = null,Object? receiptDate = null,Object? amount = null,Object? imageId = freezed,Object? status = null,}) {
  return _then(ReceiptInfo(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,lineId: null == lineId ? _self.lineId : lineId // ignore: cast_nullable_to_non_nullable
as String,lineNo: freezed == lineNo ? _self.lineNo : lineNo // ignore: cast_nullable_to_non_nullable
as int?,receiptNo: freezed == receiptNo ? _self.receiptNo : receiptNo // ignore: cast_nullable_to_non_nullable
as String?,vendorName: null == vendorName ? _self.vendorName : vendorName // ignore: cast_nullable_to_non_nullable
as String,receiptDate: null == receiptDate ? _self.receiptDate : receiptDate // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,imageId: freezed == imageId ? _self.imageId : imageId // ignore: cast_nullable_to_non_nullable
as int?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReceiptInfo].
extension ReceiptInfoPatterns on ReceiptInfo {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReceiptInfo value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReceiptInfo() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReceiptInfo value)  $default,){
final _that = this;
switch (_that) {
case _ReceiptInfo():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReceiptInfo value)?  $default,){
final _that = this;
switch (_that) {
case _ReceiptInfo() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String lineId,  int? lineNo,  String? receiptNo,  String vendorName,  String receiptDate,  int amount,  int? imageId,  String status)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReceiptInfo() when $default != null:
return $default(_that.id,_that.lineId,_that.lineNo,_that.receiptNo,_that.vendorName,_that.receiptDate,_that.amount,_that.imageId,_that.status);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String lineId,  int? lineNo,  String? receiptNo,  String vendorName,  String receiptDate,  int amount,  int? imageId,  String status)  $default,) {final _that = this;
switch (_that) {
case _ReceiptInfo():
return $default(_that.id,_that.lineId,_that.lineNo,_that.receiptNo,_that.vendorName,_that.receiptDate,_that.amount,_that.imageId,_that.status);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String lineId,  int? lineNo,  String? receiptNo,  String vendorName,  String receiptDate,  int amount,  int? imageId,  String status)?  $default,) {final _that = this;
switch (_that) {
case _ReceiptInfo() when $default != null:
return $default(_that.id,_that.lineId,_that.lineNo,_that.receiptNo,_that.vendorName,_that.receiptDate,_that.amount,_that.imageId,_that.status);case _:
  return null;

}
}

}

/// @nodoc


class _ReceiptInfo implements ReceiptInfo {
  const _ReceiptInfo({required this.id, required this.lineId, this.lineNo, this.receiptNo, required this.vendorName, required this.receiptDate, required this.amount, this.imageId, required this.status});
  

@override final  int id;
@override final  String lineId;
@override final  int? lineNo;
@override final  String? receiptNo;
@override final  String vendorName;
@override final  String receiptDate;
@override final  int amount;
@override final  int? imageId;
@override final  String status;

/// Create a copy of ReceiptInfo
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReceiptInfoCopyWith<_ReceiptInfo> get copyWith => __$ReceiptInfoCopyWithImpl<_ReceiptInfo>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReceiptInfo&&(identical(other.id, id) || other.id == id)&&(identical(other.lineId, lineId) || other.lineId == lineId)&&(identical(other.lineNo, lineNo) || other.lineNo == lineNo)&&(identical(other.receiptNo, receiptNo) || other.receiptNo == receiptNo)&&(identical(other.vendorName, vendorName) || other.vendorName == vendorName)&&(identical(other.receiptDate, receiptDate) || other.receiptDate == receiptDate)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.imageId, imageId) || other.imageId == imageId)&&(identical(other.status, status) || other.status == status));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,lineId,lineNo,receiptNo,vendorName,receiptDate,amount,imageId,status);
}

@override
String toString() {
    return 'ReceiptInfo(id: $id, lineId: $lineId, lineNo: $lineNo, receiptNo: $receiptNo, vendorName: $vendorName, receiptDate: $receiptDate, amount: $amount, imageId: $imageId, status: $status)';
}


}

/// @nodoc
abstract mixin class _$ReceiptInfoCopyWith<$Res> implements $ReceiptInfoCopyWith<$Res> {
  factory _$ReceiptInfoCopyWith(_ReceiptInfo value, $Res Function(_ReceiptInfo) _then) = __$ReceiptInfoCopyWithImpl;
@override @useResult
$Res call({
 int id, String lineId, int? lineNo, String? receiptNo, String vendorName, String receiptDate, int amount, int? imageId, String status
});




}
/// @nodoc
class __$ReceiptInfoCopyWithImpl<$Res>
    implements _$ReceiptInfoCopyWith<$Res> {
  __$ReceiptInfoCopyWithImpl(this._self, this._then);

  final _ReceiptInfo _self;
  final $Res Function(_ReceiptInfo) _then;

/// Create a copy of ReceiptInfo
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? lineId = null,Object? lineNo = freezed,Object? receiptNo = freezed,Object? vendorName = null,Object? receiptDate = null,Object? amount = null,Object? imageId = freezed,Object? status = null,}) {
  return _then(_ReceiptInfo(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,lineId: null == lineId ? _self.lineId : lineId // ignore: cast_nullable_to_non_nullable
as String,lineNo: freezed == lineNo ? _self.lineNo : lineNo // ignore: cast_nullable_to_non_nullable
as int?,receiptNo: freezed == receiptNo ? _self.receiptNo : receiptNo // ignore: cast_nullable_to_non_nullable
as String?,vendorName: null == vendorName ? _self.vendorName : vendorName // ignore: cast_nullable_to_non_nullable
as String,receiptDate: null == receiptDate ? _self.receiptDate : receiptDate // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,imageId: freezed == imageId ? _self.imageId : imageId // ignore: cast_nullable_to_non_nullable
as int?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc
mixin _$ApprovalEntry {

 int get id; int get cycle; SignPosition get position; int get level; String? get actorName; bool get onBehalf; String get decision; String? get reason; String? get decidedAt;
/// Create a copy of ApprovalEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ApprovalEntryCopyWith<ApprovalEntry> get copyWith => _$ApprovalEntryCopyWithImpl<ApprovalEntry>(this as ApprovalEntry, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ApprovalEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ApprovalEntry&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.cycle, _this.cycle) || other.cycle == _this.cycle)&&(identical(other.position, _this.position) || other.position == _this.position)&&(identical(other.level, _this.level) || other.level == _this.level)&&(identical(other.actorName, _this.actorName) || other.actorName == _this.actorName)&&(identical(other.onBehalf, _this.onBehalf) || other.onBehalf == _this.onBehalf)&&(identical(other.decision, _this.decision) || other.decision == _this.decision)&&(identical(other.reason, _this.reason) || other.reason == _this.reason)&&(identical(other.decidedAt, _this.decidedAt) || other.decidedAt == _this.decidedAt));
}


@override
int get hashCode {
  final _this = this as ApprovalEntry;
  return Object.hash(runtimeType,_this.id,_this.cycle,_this.position,_this.level,_this.actorName,_this.onBehalf,_this.decision,_this.reason,_this.decidedAt);
}

@override
String toString() {
  final _this = this as ApprovalEntry;
  return 'ApprovalEntry(id: ${_this.id}, cycle: ${_this.cycle}, position: ${_this.position}, level: ${_this.level}, actorName: ${_this.actorName}, onBehalf: ${_this.onBehalf}, decision: ${_this.decision}, reason: ${_this.reason}, decidedAt: ${_this.decidedAt})';
}


}

/// @nodoc
abstract mixin class $ApprovalEntryCopyWith<$Res>  {
  factory $ApprovalEntryCopyWith(ApprovalEntry value, $Res Function(ApprovalEntry) _then) = _$ApprovalEntryCopyWithImpl;
@useResult
$Res call({
 int id, int cycle, SignPosition position, int level, String? actorName, bool onBehalf, String decision, String? reason, String? decidedAt
});




}
/// @nodoc
class _$ApprovalEntryCopyWithImpl<$Res>
    implements $ApprovalEntryCopyWith<$Res> {
  _$ApprovalEntryCopyWithImpl(this._self, this._then);

  final ApprovalEntry _self;
  final $Res Function(ApprovalEntry) _then;

/// Create a copy of ApprovalEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? cycle = null,Object? position = null,Object? level = null,Object? actorName = freezed,Object? onBehalf = null,Object? decision = null,Object? reason = freezed,Object? decidedAt = freezed,}) {
  return _then(ApprovalEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,cycle: null == cycle ? _self.cycle : cycle // ignore: cast_nullable_to_non_nullable
as int,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as SignPosition,level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int,actorName: freezed == actorName ? _self.actorName : actorName // ignore: cast_nullable_to_non_nullable
as String?,onBehalf: null == onBehalf ? _self.onBehalf : onBehalf // ignore: cast_nullable_to_non_nullable
as bool,decision: null == decision ? _self.decision : decision // ignore: cast_nullable_to_non_nullable
as String,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,decidedAt: freezed == decidedAt ? _self.decidedAt : decidedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ApprovalEntry].
extension ApprovalEntryPatterns on ApprovalEntry {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ApprovalEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ApprovalEntry() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ApprovalEntry value)  $default,){
final _that = this;
switch (_that) {
case _ApprovalEntry():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ApprovalEntry value)?  $default,){
final _that = this;
switch (_that) {
case _ApprovalEntry() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  int cycle,  SignPosition position,  int level,  String? actorName,  bool onBehalf,  String decision,  String? reason,  String? decidedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ApprovalEntry() when $default != null:
return $default(_that.id,_that.cycle,_that.position,_that.level,_that.actorName,_that.onBehalf,_that.decision,_that.reason,_that.decidedAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  int cycle,  SignPosition position,  int level,  String? actorName,  bool onBehalf,  String decision,  String? reason,  String? decidedAt)  $default,) {final _that = this;
switch (_that) {
case _ApprovalEntry():
return $default(_that.id,_that.cycle,_that.position,_that.level,_that.actorName,_that.onBehalf,_that.decision,_that.reason,_that.decidedAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  int cycle,  SignPosition position,  int level,  String? actorName,  bool onBehalf,  String decision,  String? reason,  String? decidedAt)?  $default,) {final _that = this;
switch (_that) {
case _ApprovalEntry() when $default != null:
return $default(_that.id,_that.cycle,_that.position,_that.level,_that.actorName,_that.onBehalf,_that.decision,_that.reason,_that.decidedAt);case _:
  return null;

}
}

}

/// @nodoc


class _ApprovalEntry implements ApprovalEntry {
  const _ApprovalEntry({required this.id, required this.cycle, required this.position, required this.level, this.actorName, this.onBehalf = false, required this.decision, this.reason, this.decidedAt});
  

@override final  int id;
@override final  int cycle;
@override final  SignPosition position;
@override final  int level;
@override final  String? actorName;
@override@JsonKey() final  bool onBehalf;
@override final  String decision;
@override final  String? reason;
@override final  String? decidedAt;

/// Create a copy of ApprovalEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ApprovalEntryCopyWith<_ApprovalEntry> get copyWith => __$ApprovalEntryCopyWithImpl<_ApprovalEntry>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ApprovalEntry&&(identical(other.id, id) || other.id == id)&&(identical(other.cycle, cycle) || other.cycle == cycle)&&(identical(other.position, position) || other.position == position)&&(identical(other.level, level) || other.level == level)&&(identical(other.actorName, actorName) || other.actorName == actorName)&&(identical(other.onBehalf, onBehalf) || other.onBehalf == onBehalf)&&(identical(other.decision, decision) || other.decision == decision)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.decidedAt, decidedAt) || other.decidedAt == decidedAt));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,cycle,position,level,actorName,onBehalf,decision,reason,decidedAt);
}

@override
String toString() {
    return 'ApprovalEntry(id: $id, cycle: $cycle, position: $position, level: $level, actorName: $actorName, onBehalf: $onBehalf, decision: $decision, reason: $reason, decidedAt: $decidedAt)';
}


}

/// @nodoc
abstract mixin class _$ApprovalEntryCopyWith<$Res> implements $ApprovalEntryCopyWith<$Res> {
  factory _$ApprovalEntryCopyWith(_ApprovalEntry value, $Res Function(_ApprovalEntry) _then) = __$ApprovalEntryCopyWithImpl;
@override @useResult
$Res call({
 int id, int cycle, SignPosition position, int level, String? actorName, bool onBehalf, String decision, String? reason, String? decidedAt
});




}
/// @nodoc
class __$ApprovalEntryCopyWithImpl<$Res>
    implements _$ApprovalEntryCopyWith<$Res> {
  __$ApprovalEntryCopyWithImpl(this._self, this._then);

  final _ApprovalEntry _self;
  final $Res Function(_ApprovalEntry) _then;

/// Create a copy of ApprovalEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? cycle = null,Object? position = null,Object? level = null,Object? actorName = freezed,Object? onBehalf = null,Object? decision = null,Object? reason = freezed,Object? decidedAt = freezed,}) {
  return _then(_ApprovalEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,cycle: null == cycle ? _self.cycle : cycle // ignore: cast_nullable_to_non_nullable
as int,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as SignPosition,level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int,actorName: freezed == actorName ? _self.actorName : actorName // ignore: cast_nullable_to_non_nullable
as String?,onBehalf: null == onBehalf ? _self.onBehalf : onBehalf // ignore: cast_nullable_to_non_nullable
as bool,decision: null == decision ? _self.decision : decision // ignore: cast_nullable_to_non_nullable
as String,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,decidedAt: freezed == decidedAt ? _self.decidedAt : decidedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

/// @nodoc
mixin _$RuleStep {

 int get level; String? get approverRole; int? get approverUserId;
/// Create a copy of RuleStep
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RuleStepCopyWith<RuleStep> get copyWith => _$RuleStepCopyWithImpl<RuleStep>(this as RuleStep, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as RuleStep;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RuleStep&&(identical(other.level, _this.level) || other.level == _this.level)&&(identical(other.approverRole, _this.approverRole) || other.approverRole == _this.approverRole)&&(identical(other.approverUserId, _this.approverUserId) || other.approverUserId == _this.approverUserId));
}


@override
int get hashCode {
  final _this = this as RuleStep;
  return Object.hash(runtimeType,_this.level,_this.approverRole,_this.approverUserId);
}

@override
String toString() {
  final _this = this as RuleStep;
  return 'RuleStep(level: ${_this.level}, approverRole: ${_this.approverRole}, approverUserId: ${_this.approverUserId})';
}


}

/// @nodoc
abstract mixin class $RuleStepCopyWith<$Res>  {
  factory $RuleStepCopyWith(RuleStep value, $Res Function(RuleStep) _then) = _$RuleStepCopyWithImpl;
@useResult
$Res call({
 int level, String? approverRole, int? approverUserId
});




}
/// @nodoc
class _$RuleStepCopyWithImpl<$Res>
    implements $RuleStepCopyWith<$Res> {
  _$RuleStepCopyWithImpl(this._self, this._then);

  final RuleStep _self;
  final $Res Function(RuleStep) _then;

/// Create a copy of RuleStep
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? level = null,Object? approverRole = freezed,Object? approverUserId = freezed,}) {
  return _then(RuleStep(
level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int,approverRole: freezed == approverRole ? _self.approverRole : approverRole // ignore: cast_nullable_to_non_nullable
as String?,approverUserId: freezed == approverUserId ? _self.approverUserId : approverUserId // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [RuleStep].
extension RuleStepPatterns on RuleStep {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RuleStep value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RuleStep() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RuleStep value)  $default,){
final _that = this;
switch (_that) {
case _RuleStep():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RuleStep value)?  $default,){
final _that = this;
switch (_that) {
case _RuleStep() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int level,  String? approverRole,  int? approverUserId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RuleStep() when $default != null:
return $default(_that.level,_that.approverRole,_that.approverUserId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int level,  String? approverRole,  int? approverUserId)  $default,) {final _that = this;
switch (_that) {
case _RuleStep():
return $default(_that.level,_that.approverRole,_that.approverUserId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int level,  String? approverRole,  int? approverUserId)?  $default,) {final _that = this;
switch (_that) {
case _RuleStep() when $default != null:
return $default(_that.level,_that.approverRole,_that.approverUserId);case _:
  return null;

}
}

}

/// @nodoc


class _RuleStep implements RuleStep {
  const _RuleStep({required this.level, this.approverRole, this.approverUserId});
  

@override final  int level;
@override final  String? approverRole;
@override final  int? approverUserId;

/// Create a copy of RuleStep
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RuleStepCopyWith<_RuleStep> get copyWith => __$RuleStepCopyWithImpl<_RuleStep>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RuleStep&&(identical(other.level, level) || other.level == level)&&(identical(other.approverRole, approverRole) || other.approverRole == approverRole)&&(identical(other.approverUserId, approverUserId) || other.approverUserId == approverUserId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,level,approverRole,approverUserId);
}

@override
String toString() {
    return 'RuleStep(level: $level, approverRole: $approverRole, approverUserId: $approverUserId)';
}


}

/// @nodoc
abstract mixin class _$RuleStepCopyWith<$Res> implements $RuleStepCopyWith<$Res> {
  factory _$RuleStepCopyWith(_RuleStep value, $Res Function(_RuleStep) _then) = __$RuleStepCopyWithImpl;
@override @useResult
$Res call({
 int level, String? approverRole, int? approverUserId
});




}
/// @nodoc
class __$RuleStepCopyWithImpl<$Res>
    implements _$RuleStepCopyWith<$Res> {
  __$RuleStepCopyWithImpl(this._self, this._then);

  final _RuleStep _self;
  final $Res Function(_RuleStep) _then;

/// Create a copy of RuleStep
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? level = null,Object? approverRole = freezed,Object? approverUserId = freezed,}) {
  return _then(_RuleStep(
level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int,approverRole: freezed == approverRole ? _self.approverRole : approverRole // ignore: cast_nullable_to_non_nullable
as String?,approverUserId: freezed == approverUserId ? _self.approverUserId : approverUserId // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

/// @nodoc
mixin _$ApprovalRuleInfo {

 String get name; String get acknowledge; String? get acknowledgeDelegatedTo; List<RuleStep> get steps;
/// Create a copy of ApprovalRuleInfo
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ApprovalRuleInfoCopyWith<ApprovalRuleInfo> get copyWith => _$ApprovalRuleInfoCopyWithImpl<ApprovalRuleInfo>(this as ApprovalRuleInfo, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ApprovalRuleInfo;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ApprovalRuleInfo&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.acknowledge, _this.acknowledge) || other.acknowledge == _this.acknowledge)&&(identical(other.acknowledgeDelegatedTo, _this.acknowledgeDelegatedTo) || other.acknowledgeDelegatedTo == _this.acknowledgeDelegatedTo)&&const DeepCollectionEquality().equals(other.steps, _this.steps));
}


@override
int get hashCode {
  final _this = this as ApprovalRuleInfo;
  return Object.hash(runtimeType,_this.name,_this.acknowledge,_this.acknowledgeDelegatedTo,const DeepCollectionEquality().hash(_this.steps));
}

@override
String toString() {
  final _this = this as ApprovalRuleInfo;
  return 'ApprovalRuleInfo(name: ${_this.name}, acknowledge: ${_this.acknowledge}, acknowledgeDelegatedTo: ${_this.acknowledgeDelegatedTo}, steps: ${_this.steps})';
}


}

/// @nodoc
abstract mixin class $ApprovalRuleInfoCopyWith<$Res>  {
  factory $ApprovalRuleInfoCopyWith(ApprovalRuleInfo value, $Res Function(ApprovalRuleInfo) _then) = _$ApprovalRuleInfoCopyWithImpl;
@useResult
$Res call({
 String name, String acknowledge, String? acknowledgeDelegatedTo, List<RuleStep> steps
});




}
/// @nodoc
class _$ApprovalRuleInfoCopyWithImpl<$Res>
    implements $ApprovalRuleInfoCopyWith<$Res> {
  _$ApprovalRuleInfoCopyWithImpl(this._self, this._then);

  final ApprovalRuleInfo _self;
  final $Res Function(ApprovalRuleInfo) _then;

/// Create a copy of ApprovalRuleInfo
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? acknowledge = null,Object? acknowledgeDelegatedTo = freezed,Object? steps = null,}) {
  return _then(ApprovalRuleInfo(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,acknowledge: null == acknowledge ? _self.acknowledge : acknowledge // ignore: cast_nullable_to_non_nullable
as String,acknowledgeDelegatedTo: freezed == acknowledgeDelegatedTo ? _self.acknowledgeDelegatedTo : acknowledgeDelegatedTo // ignore: cast_nullable_to_non_nullable
as String?,steps: null == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as List<RuleStep>,
  ));
}

}


/// Adds pattern-matching-related methods to [ApprovalRuleInfo].
extension ApprovalRuleInfoPatterns on ApprovalRuleInfo {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ApprovalRuleInfo value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ApprovalRuleInfo() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ApprovalRuleInfo value)  $default,){
final _that = this;
switch (_that) {
case _ApprovalRuleInfo():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ApprovalRuleInfo value)?  $default,){
final _that = this;
switch (_that) {
case _ApprovalRuleInfo() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String acknowledge,  String? acknowledgeDelegatedTo,  List<RuleStep> steps)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ApprovalRuleInfo() when $default != null:
return $default(_that.name,_that.acknowledge,_that.acknowledgeDelegatedTo,_that.steps);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String acknowledge,  String? acknowledgeDelegatedTo,  List<RuleStep> steps)  $default,) {final _that = this;
switch (_that) {
case _ApprovalRuleInfo():
return $default(_that.name,_that.acknowledge,_that.acknowledgeDelegatedTo,_that.steps);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String acknowledge,  String? acknowledgeDelegatedTo,  List<RuleStep> steps)?  $default,) {final _that = this;
switch (_that) {
case _ApprovalRuleInfo() when $default != null:
return $default(_that.name,_that.acknowledge,_that.acknowledgeDelegatedTo,_that.steps);case _:
  return null;

}
}

}

/// @nodoc


class _ApprovalRuleInfo implements ApprovalRuleInfo {
  const _ApprovalRuleInfo({required this.name, required this.acknowledge, this.acknowledgeDelegatedTo,  List<RuleStep> steps = const []}): _steps = steps;
  

@override final  String name;
@override final  String acknowledge;
@override final  String? acknowledgeDelegatedTo;
 final  List<RuleStep> _steps;
@override@JsonKey() List<RuleStep> get steps {
  if (_steps is EqualUnmodifiableListView) return _steps;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_steps);
}


/// Create a copy of ApprovalRuleInfo
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ApprovalRuleInfoCopyWith<_ApprovalRuleInfo> get copyWith => __$ApprovalRuleInfoCopyWithImpl<_ApprovalRuleInfo>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ApprovalRuleInfo&&(identical(other.name, name) || other.name == name)&&(identical(other.acknowledge, acknowledge) || other.acknowledge == acknowledge)&&(identical(other.acknowledgeDelegatedTo, acknowledgeDelegatedTo) || other.acknowledgeDelegatedTo == acknowledgeDelegatedTo)&&const DeepCollectionEquality().equals(other.steps, _steps));
}


@override
int get hashCode {
    return Object.hash(runtimeType,name,acknowledge,acknowledgeDelegatedTo,const DeepCollectionEquality().hash(_steps));
}

@override
String toString() {
    return 'ApprovalRuleInfo(name: $name, acknowledge: $acknowledge, acknowledgeDelegatedTo: $acknowledgeDelegatedTo, steps: $steps)';
}


}

/// @nodoc
abstract mixin class _$ApprovalRuleInfoCopyWith<$Res> implements $ApprovalRuleInfoCopyWith<$Res> {
  factory _$ApprovalRuleInfoCopyWith(_ApprovalRuleInfo value, $Res Function(_ApprovalRuleInfo) _then) = __$ApprovalRuleInfoCopyWithImpl;
@override @useResult
$Res call({
 String name, String acknowledge, String? acknowledgeDelegatedTo, List<RuleStep> steps
});




}
/// @nodoc
class __$ApprovalRuleInfoCopyWithImpl<$Res>
    implements _$ApprovalRuleInfoCopyWith<$Res> {
  __$ApprovalRuleInfoCopyWithImpl(this._self, this._then);

  final _ApprovalRuleInfo _self;
  final $Res Function(_ApprovalRuleInfo) _then;

/// Create a copy of ApprovalRuleInfo
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? acknowledge = null,Object? acknowledgeDelegatedTo = freezed,Object? steps = null,}) {
  return _then(_ApprovalRuleInfo(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,acknowledge: null == acknowledge ? _self.acknowledge : acknowledge // ignore: cast_nullable_to_non_nullable
as String,acknowledgeDelegatedTo: freezed == acknowledgeDelegatedTo ? _self.acknowledgeDelegatedTo : acknowledgeDelegatedTo // ignore: cast_nullable_to_non_nullable
as String?,steps: null == steps ? _self._steps : steps // ignore: cast_nullable_to_non_nullable
as List<RuleStep>,
  ));
}


}

/// @nodoc
mixin _$FlagInfo {

 int get id; String get kind; String get kindLabel; String get level; String get status; int? get lineNo; String get message;
/// Create a copy of FlagInfo
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FlagInfoCopyWith<FlagInfo> get copyWith => _$FlagInfoCopyWithImpl<FlagInfo>(this as FlagInfo, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as FlagInfo;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FlagInfo&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&(identical(other.kindLabel, _this.kindLabel) || other.kindLabel == _this.kindLabel)&&(identical(other.level, _this.level) || other.level == _this.level)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.lineNo, _this.lineNo) || other.lineNo == _this.lineNo)&&(identical(other.message, _this.message) || other.message == _this.message));
}


@override
int get hashCode {
  final _this = this as FlagInfo;
  return Object.hash(runtimeType,_this.id,_this.kind,_this.kindLabel,_this.level,_this.status,_this.lineNo,_this.message);
}

@override
String toString() {
  final _this = this as FlagInfo;
  return 'FlagInfo(id: ${_this.id}, kind: ${_this.kind}, kindLabel: ${_this.kindLabel}, level: ${_this.level}, status: ${_this.status}, lineNo: ${_this.lineNo}, message: ${_this.message})';
}


}

/// @nodoc
abstract mixin class $FlagInfoCopyWith<$Res>  {
  factory $FlagInfoCopyWith(FlagInfo value, $Res Function(FlagInfo) _then) = _$FlagInfoCopyWithImpl;
@useResult
$Res call({
 int id, String kind, String kindLabel, String level, String status, int? lineNo, String message
});




}
/// @nodoc
class _$FlagInfoCopyWithImpl<$Res>
    implements $FlagInfoCopyWith<$Res> {
  _$FlagInfoCopyWithImpl(this._self, this._then);

  final FlagInfo _self;
  final $Res Function(FlagInfo) _then;

/// Create a copy of FlagInfo
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? kind = null,Object? kindLabel = null,Object? level = null,Object? status = null,Object? lineNo = freezed,Object? message = null,}) {
  return _then(FlagInfo(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,kindLabel: null == kindLabel ? _self.kindLabel : kindLabel // ignore: cast_nullable_to_non_nullable
as String,level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,lineNo: freezed == lineNo ? _self.lineNo : lineNo // ignore: cast_nullable_to_non_nullable
as int?,message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [FlagInfo].
extension FlagInfoPatterns on FlagInfo {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FlagInfo value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FlagInfo() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FlagInfo value)  $default,){
final _that = this;
switch (_that) {
case _FlagInfo():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FlagInfo value)?  $default,){
final _that = this;
switch (_that) {
case _FlagInfo() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String kind,  String kindLabel,  String level,  String status,  int? lineNo,  String message)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FlagInfo() when $default != null:
return $default(_that.id,_that.kind,_that.kindLabel,_that.level,_that.status,_that.lineNo,_that.message);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String kind,  String kindLabel,  String level,  String status,  int? lineNo,  String message)  $default,) {final _that = this;
switch (_that) {
case _FlagInfo():
return $default(_that.id,_that.kind,_that.kindLabel,_that.level,_that.status,_that.lineNo,_that.message);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String kind,  String kindLabel,  String level,  String status,  int? lineNo,  String message)?  $default,) {final _that = this;
switch (_that) {
case _FlagInfo() when $default != null:
return $default(_that.id,_that.kind,_that.kindLabel,_that.level,_that.status,_that.lineNo,_that.message);case _:
  return null;

}
}

}

/// @nodoc


class _FlagInfo implements FlagInfo {
  const _FlagInfo({required this.id, required this.kind, required this.kindLabel, required this.level, required this.status, this.lineNo, required this.message});
  

@override final  int id;
@override final  String kind;
@override final  String kindLabel;
@override final  String level;
@override final  String status;
@override final  int? lineNo;
@override final  String message;

/// Create a copy of FlagInfo
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FlagInfoCopyWith<_FlagInfo> get copyWith => __$FlagInfoCopyWithImpl<_FlagInfo>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FlagInfo&&(identical(other.id, id) || other.id == id)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.kindLabel, kindLabel) || other.kindLabel == kindLabel)&&(identical(other.level, level) || other.level == level)&&(identical(other.status, status) || other.status == status)&&(identical(other.lineNo, lineNo) || other.lineNo == lineNo)&&(identical(other.message, message) || other.message == message));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,kind,kindLabel,level,status,lineNo,message);
}

@override
String toString() {
    return 'FlagInfo(id: $id, kind: $kind, kindLabel: $kindLabel, level: $level, status: $status, lineNo: $lineNo, message: $message)';
}


}

/// @nodoc
abstract mixin class _$FlagInfoCopyWith<$Res> implements $FlagInfoCopyWith<$Res> {
  factory _$FlagInfoCopyWith(_FlagInfo value, $Res Function(_FlagInfo) _then) = __$FlagInfoCopyWithImpl;
@override @useResult
$Res call({
 int id, String kind, String kindLabel, String level, String status, int? lineNo, String message
});




}
/// @nodoc
class __$FlagInfoCopyWithImpl<$Res>
    implements _$FlagInfoCopyWith<$Res> {
  __$FlagInfoCopyWithImpl(this._self, this._then);

  final _FlagInfo _self;
  final $Res Function(_FlagInfo) _then;

/// Create a copy of FlagInfo
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? kind = null,Object? kindLabel = null,Object? level = null,Object? status = null,Object? lineNo = freezed,Object? message = null,}) {
  return _then(_FlagInfo(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,kindLabel: null == kindLabel ? _self.kindLabel : kindLabel // ignore: cast_nullable_to_non_nullable
as String,level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,lineNo: freezed == lineNo ? _self.lineNo : lineNo // ignore: cast_nullable_to_non_nullable
as int?,message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc
mixin _$BudgetImpact {

 String get basis; double? get pctBefore; double? get pctAfter;
/// Create a copy of BudgetImpact
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BudgetImpactCopyWith<BudgetImpact> get copyWith => _$BudgetImpactCopyWithImpl<BudgetImpact>(this as BudgetImpact, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as BudgetImpact;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BudgetImpact&&(identical(other.basis, _this.basis) || other.basis == _this.basis)&&(identical(other.pctBefore, _this.pctBefore) || other.pctBefore == _this.pctBefore)&&(identical(other.pctAfter, _this.pctAfter) || other.pctAfter == _this.pctAfter));
}


@override
int get hashCode {
  final _this = this as BudgetImpact;
  return Object.hash(runtimeType,_this.basis,_this.pctBefore,_this.pctAfter);
}

@override
String toString() {
  final _this = this as BudgetImpact;
  return 'BudgetImpact(basis: ${_this.basis}, pctBefore: ${_this.pctBefore}, pctAfter: ${_this.pctAfter})';
}


}

/// @nodoc
abstract mixin class $BudgetImpactCopyWith<$Res>  {
  factory $BudgetImpactCopyWith(BudgetImpact value, $Res Function(BudgetImpact) _then) = _$BudgetImpactCopyWithImpl;
@useResult
$Res call({
 String basis, double? pctBefore, double? pctAfter
});




}
/// @nodoc
class _$BudgetImpactCopyWithImpl<$Res>
    implements $BudgetImpactCopyWith<$Res> {
  _$BudgetImpactCopyWithImpl(this._self, this._then);

  final BudgetImpact _self;
  final $Res Function(BudgetImpact) _then;

/// Create a copy of BudgetImpact
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? basis = null,Object? pctBefore = freezed,Object? pctAfter = freezed,}) {
  return _then(BudgetImpact(
basis: null == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String,pctBefore: freezed == pctBefore ? _self.pctBefore : pctBefore // ignore: cast_nullable_to_non_nullable
as double?,pctAfter: freezed == pctAfter ? _self.pctAfter : pctAfter // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [BudgetImpact].
extension BudgetImpactPatterns on BudgetImpact {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BudgetImpact value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BudgetImpact() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BudgetImpact value)  $default,){
final _that = this;
switch (_that) {
case _BudgetImpact():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BudgetImpact value)?  $default,){
final _that = this;
switch (_that) {
case _BudgetImpact() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String basis,  double? pctBefore,  double? pctAfter)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BudgetImpact() when $default != null:
return $default(_that.basis,_that.pctBefore,_that.pctAfter);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String basis,  double? pctBefore,  double? pctAfter)  $default,) {final _that = this;
switch (_that) {
case _BudgetImpact():
return $default(_that.basis,_that.pctBefore,_that.pctAfter);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String basis,  double? pctBefore,  double? pctAfter)?  $default,) {final _that = this;
switch (_that) {
case _BudgetImpact() when $default != null:
return $default(_that.basis,_that.pctBefore,_that.pctAfter);case _:
  return null;

}
}

}

/// @nodoc


class _BudgetImpact extends BudgetImpact {
  const _BudgetImpact({required this.basis, this.pctBefore, this.pctAfter}): super._();
  

@override final  String basis;
@override final  double? pctBefore;
@override final  double? pctAfter;

/// Create a copy of BudgetImpact
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BudgetImpactCopyWith<_BudgetImpact> get copyWith => __$BudgetImpactCopyWithImpl<_BudgetImpact>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BudgetImpact&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.pctBefore, pctBefore) || other.pctBefore == pctBefore)&&(identical(other.pctAfter, pctAfter) || other.pctAfter == pctAfter));
}


@override
int get hashCode {
    return Object.hash(runtimeType,basis,pctBefore,pctAfter);
}

@override
String toString() {
    return 'BudgetImpact(basis: $basis, pctBefore: $pctBefore, pctAfter: $pctAfter)';
}


}

/// @nodoc
abstract mixin class _$BudgetImpactCopyWith<$Res> implements $BudgetImpactCopyWith<$Res> {
  factory _$BudgetImpactCopyWith(_BudgetImpact value, $Res Function(_BudgetImpact) _then) = __$BudgetImpactCopyWithImpl;
@override @useResult
$Res call({
 String basis, double? pctBefore, double? pctAfter
});




}
/// @nodoc
class __$BudgetImpactCopyWithImpl<$Res>
    implements _$BudgetImpactCopyWith<$Res> {
  __$BudgetImpactCopyWithImpl(this._self, this._then);

  final _BudgetImpact _self;
  final $Res Function(_BudgetImpact) _then;

/// Create a copy of BudgetImpact
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? basis = null,Object? pctBefore = freezed,Object? pctAfter = freezed,}) {
  return _then(_BudgetImpact(
basis: null == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String,pctBefore: freezed == pctBefore ? _self.pctBefore : pctBefore // ignore: cast_nullable_to_non_nullable
as double?,pctAfter: freezed == pctAfter ? _self.pctAfter : pctAfter // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}

/// @nodoc
mixin _$ExpenseDetail {

 int get id; String? get docNo; String? get clientUuid; RequestType get type; String get typeLabel; RequestStatus get status; String get statusLabel; String get title; int get grandTotal; int? get approvedAmount; String? get requestDate; String? get neededDate; String? get notes; RefItem? get project; RefItem? get costCenter; List<RefItem> get requesters; String? get createdByName; String? get bankName; String? get bankAccountNo; String? get bankAccountHolder; List<ExpenseLine> get lines; List<ReceiptInfo> get receipts; List<ApprovalEntry> get approvals; ApprovalRuleInfo? get approvalRule; int get approvalCycle; int? get currentLevel; List<FlagInfo> get flags; BudgetImpact get budget; Set<String> get allowedActions; String? get rejectReason; String? get cancelReason; String? get submittedAt; String? get updatedAt;
/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExpenseDetailCopyWith<ExpenseDetail> get copyWith => _$ExpenseDetailCopyWithImpl<ExpenseDetail>(this as ExpenseDetail, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ExpenseDetail;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExpenseDetail&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.docNo, _this.docNo) || other.docNo == _this.docNo)&&(identical(other.clientUuid, _this.clientUuid) || other.clientUuid == _this.clientUuid)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.typeLabel, _this.typeLabel) || other.typeLabel == _this.typeLabel)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.statusLabel, _this.statusLabel) || other.statusLabel == _this.statusLabel)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.grandTotal, _this.grandTotal) || other.grandTotal == _this.grandTotal)&&(identical(other.approvedAmount, _this.approvedAmount) || other.approvedAmount == _this.approvedAmount)&&(identical(other.requestDate, _this.requestDate) || other.requestDate == _this.requestDate)&&(identical(other.neededDate, _this.neededDate) || other.neededDate == _this.neededDate)&&(identical(other.notes, _this.notes) || other.notes == _this.notes)&&(identical(other.project, _this.project) || other.project == _this.project)&&(identical(other.costCenter, _this.costCenter) || other.costCenter == _this.costCenter)&&const DeepCollectionEquality().equals(other.requesters, _this.requesters)&&(identical(other.createdByName, _this.createdByName) || other.createdByName == _this.createdByName)&&(identical(other.bankName, _this.bankName) || other.bankName == _this.bankName)&&(identical(other.bankAccountNo, _this.bankAccountNo) || other.bankAccountNo == _this.bankAccountNo)&&(identical(other.bankAccountHolder, _this.bankAccountHolder) || other.bankAccountHolder == _this.bankAccountHolder)&&const DeepCollectionEquality().equals(other.lines, _this.lines)&&const DeepCollectionEquality().equals(other.receipts, _this.receipts)&&const DeepCollectionEquality().equals(other.approvals, _this.approvals)&&(identical(other.approvalRule, _this.approvalRule) || other.approvalRule == _this.approvalRule)&&(identical(other.approvalCycle, _this.approvalCycle) || other.approvalCycle == _this.approvalCycle)&&(identical(other.currentLevel, _this.currentLevel) || other.currentLevel == _this.currentLevel)&&const DeepCollectionEquality().equals(other.flags, _this.flags)&&(identical(other.budget, _this.budget) || other.budget == _this.budget)&&const DeepCollectionEquality().equals(other.allowedActions, _this.allowedActions)&&(identical(other.rejectReason, _this.rejectReason) || other.rejectReason == _this.rejectReason)&&(identical(other.cancelReason, _this.cancelReason) || other.cancelReason == _this.cancelReason)&&(identical(other.submittedAt, _this.submittedAt) || other.submittedAt == _this.submittedAt)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt));
}


@override
int get hashCode {
  final _this = this as ExpenseDetail;
  return Object.hashAll([runtimeType,_this.id,_this.docNo,_this.clientUuid,_this.type,_this.typeLabel,_this.status,_this.statusLabel,_this.title,_this.grandTotal,_this.approvedAmount,_this.requestDate,_this.neededDate,_this.notes,_this.project,_this.costCenter,const DeepCollectionEquality().hash(_this.requesters),_this.createdByName,_this.bankName,_this.bankAccountNo,_this.bankAccountHolder,const DeepCollectionEquality().hash(_this.lines),const DeepCollectionEquality().hash(_this.receipts),const DeepCollectionEquality().hash(_this.approvals),_this.approvalRule,_this.approvalCycle,_this.currentLevel,const DeepCollectionEquality().hash(_this.flags),_this.budget,const DeepCollectionEquality().hash(_this.allowedActions),_this.rejectReason,_this.cancelReason,_this.submittedAt,_this.updatedAt]);
}

@override
String toString() {
  final _this = this as ExpenseDetail;
  return 'ExpenseDetail(id: ${_this.id}, docNo: ${_this.docNo}, clientUuid: ${_this.clientUuid}, type: ${_this.type}, typeLabel: ${_this.typeLabel}, status: ${_this.status}, statusLabel: ${_this.statusLabel}, title: ${_this.title}, grandTotal: ${_this.grandTotal}, approvedAmount: ${_this.approvedAmount}, requestDate: ${_this.requestDate}, neededDate: ${_this.neededDate}, notes: ${_this.notes}, project: ${_this.project}, costCenter: ${_this.costCenter}, requesters: ${_this.requesters}, createdByName: ${_this.createdByName}, bankName: ${_this.bankName}, bankAccountNo: ${_this.bankAccountNo}, bankAccountHolder: ${_this.bankAccountHolder}, lines: ${_this.lines}, receipts: ${_this.receipts}, approvals: ${_this.approvals}, approvalRule: ${_this.approvalRule}, approvalCycle: ${_this.approvalCycle}, currentLevel: ${_this.currentLevel}, flags: ${_this.flags}, budget: ${_this.budget}, allowedActions: ${_this.allowedActions}, rejectReason: ${_this.rejectReason}, cancelReason: ${_this.cancelReason}, submittedAt: ${_this.submittedAt}, updatedAt: ${_this.updatedAt})';
}


}

/// @nodoc
abstract mixin class $ExpenseDetailCopyWith<$Res>  {
  factory $ExpenseDetailCopyWith(ExpenseDetail value, $Res Function(ExpenseDetail) _then) = _$ExpenseDetailCopyWithImpl;
@useResult
$Res call({
 int id, String? docNo, String? clientUuid, RequestType type, String typeLabel, RequestStatus status, String statusLabel, String title, int grandTotal, int? approvedAmount, String? requestDate, String? neededDate, String? notes, RefItem? project, RefItem? costCenter, List<RefItem> requesters, String? createdByName, String? bankName, String? bankAccountNo, String? bankAccountHolder, List<ExpenseLine> lines, List<ReceiptInfo> receipts, List<ApprovalEntry> approvals, ApprovalRuleInfo? approvalRule, int approvalCycle, int? currentLevel, List<FlagInfo> flags, BudgetImpact budget, Set<String> allowedActions, String? rejectReason, String? cancelReason, String? submittedAt, String? updatedAt
});


$RefItemCopyWith<$Res>? get project;$RefItemCopyWith<$Res>? get costCenter;$ApprovalRuleInfoCopyWith<$Res>? get approvalRule;$BudgetImpactCopyWith<$Res> get budget;

}
/// @nodoc
class _$ExpenseDetailCopyWithImpl<$Res>
    implements $ExpenseDetailCopyWith<$Res> {
  _$ExpenseDetailCopyWithImpl(this._self, this._then);

  final ExpenseDetail _self;
  final $Res Function(ExpenseDetail) _then;

/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? docNo = freezed,Object? clientUuid = freezed,Object? type = null,Object? typeLabel = null,Object? status = null,Object? statusLabel = null,Object? title = null,Object? grandTotal = null,Object? approvedAmount = freezed,Object? requestDate = freezed,Object? neededDate = freezed,Object? notes = freezed,Object? project = freezed,Object? costCenter = freezed,Object? requesters = null,Object? createdByName = freezed,Object? bankName = freezed,Object? bankAccountNo = freezed,Object? bankAccountHolder = freezed,Object? lines = null,Object? receipts = null,Object? approvals = null,Object? approvalRule = freezed,Object? approvalCycle = null,Object? currentLevel = freezed,Object? flags = null,Object? budget = null,Object? allowedActions = null,Object? rejectReason = freezed,Object? cancelReason = freezed,Object? submittedAt = freezed,Object? updatedAt = freezed,}) {
  return _then(ExpenseDetail(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,docNo: freezed == docNo ? _self.docNo : docNo // ignore: cast_nullable_to_non_nullable
as String?,clientUuid: freezed == clientUuid ? _self.clientUuid : clientUuid // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as RequestType,typeLabel: null == typeLabel ? _self.typeLabel : typeLabel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RequestStatus,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,grandTotal: null == grandTotal ? _self.grandTotal : grandTotal // ignore: cast_nullable_to_non_nullable
as int,approvedAmount: freezed == approvedAmount ? _self.approvedAmount : approvedAmount // ignore: cast_nullable_to_non_nullable
as int?,requestDate: freezed == requestDate ? _self.requestDate : requestDate // ignore: cast_nullable_to_non_nullable
as String?,neededDate: freezed == neededDate ? _self.neededDate : neededDate // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as RefItem?,costCenter: freezed == costCenter ? _self.costCenter : costCenter // ignore: cast_nullable_to_non_nullable
as RefItem?,requesters: null == requesters ? _self.requesters : requesters // ignore: cast_nullable_to_non_nullable
as List<RefItem>,createdByName: freezed == createdByName ? _self.createdByName : createdByName // ignore: cast_nullable_to_non_nullable
as String?,bankName: freezed == bankName ? _self.bankName : bankName // ignore: cast_nullable_to_non_nullable
as String?,bankAccountNo: freezed == bankAccountNo ? _self.bankAccountNo : bankAccountNo // ignore: cast_nullable_to_non_nullable
as String?,bankAccountHolder: freezed == bankAccountHolder ? _self.bankAccountHolder : bankAccountHolder // ignore: cast_nullable_to_non_nullable
as String?,lines: null == lines ? _self.lines : lines // ignore: cast_nullable_to_non_nullable
as List<ExpenseLine>,receipts: null == receipts ? _self.receipts : receipts // ignore: cast_nullable_to_non_nullable
as List<ReceiptInfo>,approvals: null == approvals ? _self.approvals : approvals // ignore: cast_nullable_to_non_nullable
as List<ApprovalEntry>,approvalRule: freezed == approvalRule ? _self.approvalRule : approvalRule // ignore: cast_nullable_to_non_nullable
as ApprovalRuleInfo?,approvalCycle: null == approvalCycle ? _self.approvalCycle : approvalCycle // ignore: cast_nullable_to_non_nullable
as int,currentLevel: freezed == currentLevel ? _self.currentLevel : currentLevel // ignore: cast_nullable_to_non_nullable
as int?,flags: null == flags ? _self.flags : flags // ignore: cast_nullable_to_non_nullable
as List<FlagInfo>,budget: null == budget ? _self.budget : budget // ignore: cast_nullable_to_non_nullable
as BudgetImpact,allowedActions: null == allowedActions ? _self.allowedActions : allowedActions // ignore: cast_nullable_to_non_nullable
as Set<String>,rejectReason: freezed == rejectReason ? _self.rejectReason : rejectReason // ignore: cast_nullable_to_non_nullable
as String?,cancelReason: freezed == cancelReason ? _self.cancelReason : cancelReason // ignore: cast_nullable_to_non_nullable
as String?,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get project {
    if (_self.project == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.project!, (value) {
    return _then(_self.copyWith(project: value));
  });
}/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get costCenter {
    if (_self.costCenter == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.costCenter!, (value) {
    return _then(_self.copyWith(costCenter: value));
  });
}/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ApprovalRuleInfoCopyWith<$Res>? get approvalRule {
    if (_self.approvalRule == null) {
    return null;
  }

  return $ApprovalRuleInfoCopyWith<$Res>(_self.approvalRule!, (value) {
    return _then(_self.copyWith(approvalRule: value));
  });
}/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BudgetImpactCopyWith<$Res> get budget {
  
  return $BudgetImpactCopyWith<$Res>(_self.budget, (value) {
    return _then(_self.copyWith(budget: value));
  });
}
}


/// Adds pattern-matching-related methods to [ExpenseDetail].
extension ExpenseDetailPatterns on ExpenseDetail {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExpenseDetail value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExpenseDetail() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExpenseDetail value)  $default,){
final _that = this;
switch (_that) {
case _ExpenseDetail():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExpenseDetail value)?  $default,){
final _that = this;
switch (_that) {
case _ExpenseDetail() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String? docNo,  String? clientUuid,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  int grandTotal,  int? approvedAmount,  String? requestDate,  String? neededDate,  String? notes,  RefItem? project,  RefItem? costCenter,  List<RefItem> requesters,  String? createdByName,  String? bankName,  String? bankAccountNo,  String? bankAccountHolder,  List<ExpenseLine> lines,  List<ReceiptInfo> receipts,  List<ApprovalEntry> approvals,  ApprovalRuleInfo? approvalRule,  int approvalCycle,  int? currentLevel,  List<FlagInfo> flags,  BudgetImpact budget,  Set<String> allowedActions,  String? rejectReason,  String? cancelReason,  String? submittedAt,  String? updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExpenseDetail() when $default != null:
return $default(_that.id,_that.docNo,_that.clientUuid,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.grandTotal,_that.approvedAmount,_that.requestDate,_that.neededDate,_that.notes,_that.project,_that.costCenter,_that.requesters,_that.createdByName,_that.bankName,_that.bankAccountNo,_that.bankAccountHolder,_that.lines,_that.receipts,_that.approvals,_that.approvalRule,_that.approvalCycle,_that.currentLevel,_that.flags,_that.budget,_that.allowedActions,_that.rejectReason,_that.cancelReason,_that.submittedAt,_that.updatedAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String? docNo,  String? clientUuid,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  int grandTotal,  int? approvedAmount,  String? requestDate,  String? neededDate,  String? notes,  RefItem? project,  RefItem? costCenter,  List<RefItem> requesters,  String? createdByName,  String? bankName,  String? bankAccountNo,  String? bankAccountHolder,  List<ExpenseLine> lines,  List<ReceiptInfo> receipts,  List<ApprovalEntry> approvals,  ApprovalRuleInfo? approvalRule,  int approvalCycle,  int? currentLevel,  List<FlagInfo> flags,  BudgetImpact budget,  Set<String> allowedActions,  String? rejectReason,  String? cancelReason,  String? submittedAt,  String? updatedAt)  $default,) {final _that = this;
switch (_that) {
case _ExpenseDetail():
return $default(_that.id,_that.docNo,_that.clientUuid,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.grandTotal,_that.approvedAmount,_that.requestDate,_that.neededDate,_that.notes,_that.project,_that.costCenter,_that.requesters,_that.createdByName,_that.bankName,_that.bankAccountNo,_that.bankAccountHolder,_that.lines,_that.receipts,_that.approvals,_that.approvalRule,_that.approvalCycle,_that.currentLevel,_that.flags,_that.budget,_that.allowedActions,_that.rejectReason,_that.cancelReason,_that.submittedAt,_that.updatedAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String? docNo,  String? clientUuid,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  int grandTotal,  int? approvedAmount,  String? requestDate,  String? neededDate,  String? notes,  RefItem? project,  RefItem? costCenter,  List<RefItem> requesters,  String? createdByName,  String? bankName,  String? bankAccountNo,  String? bankAccountHolder,  List<ExpenseLine> lines,  List<ReceiptInfo> receipts,  List<ApprovalEntry> approvals,  ApprovalRuleInfo? approvalRule,  int approvalCycle,  int? currentLevel,  List<FlagInfo> flags,  BudgetImpact budget,  Set<String> allowedActions,  String? rejectReason,  String? cancelReason,  String? submittedAt,  String? updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _ExpenseDetail() when $default != null:
return $default(_that.id,_that.docNo,_that.clientUuid,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.grandTotal,_that.approvedAmount,_that.requestDate,_that.neededDate,_that.notes,_that.project,_that.costCenter,_that.requesters,_that.createdByName,_that.bankName,_that.bankAccountNo,_that.bankAccountHolder,_that.lines,_that.receipts,_that.approvals,_that.approvalRule,_that.approvalCycle,_that.currentLevel,_that.flags,_that.budget,_that.allowedActions,_that.rejectReason,_that.cancelReason,_that.submittedAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc


class _ExpenseDetail implements ExpenseDetail {
  const _ExpenseDetail({required this.id, this.docNo, this.clientUuid, required this.type, required this.typeLabel, required this.status, required this.statusLabel, required this.title, required this.grandTotal, this.approvedAmount, this.requestDate, this.neededDate, this.notes, this.project, this.costCenter,  List<RefItem> requesters = const [], this.createdByName, this.bankName, this.bankAccountNo, this.bankAccountHolder,  List<ExpenseLine> lines = const [],  List<ReceiptInfo> receipts = const [],  List<ApprovalEntry> approvals = const [], this.approvalRule, this.approvalCycle = 1, this.currentLevel,  List<FlagInfo> flags = const [], this.budget = const BudgetImpact(basis: 'none'),  Set<String> allowedActions = const <String>{}, this.rejectReason, this.cancelReason, this.submittedAt, this.updatedAt}): _requesters = requesters,_lines = lines,_receipts = receipts,_approvals = approvals,_flags = flags,_allowedActions = allowedActions;
  

@override final  int id;
@override final  String? docNo;
@override final  String? clientUuid;
@override final  RequestType type;
@override final  String typeLabel;
@override final  RequestStatus status;
@override final  String statusLabel;
@override final  String title;
@override final  int grandTotal;
@override final  int? approvedAmount;
@override final  String? requestDate;
@override final  String? neededDate;
@override final  String? notes;
@override final  RefItem? project;
@override final  RefItem? costCenter;
 final  List<RefItem> _requesters;
@override@JsonKey() List<RefItem> get requesters {
  if (_requesters is EqualUnmodifiableListView) return _requesters;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_requesters);
}

@override final  String? createdByName;
@override final  String? bankName;
@override final  String? bankAccountNo;
@override final  String? bankAccountHolder;
 final  List<ExpenseLine> _lines;
@override@JsonKey() List<ExpenseLine> get lines {
  if (_lines is EqualUnmodifiableListView) return _lines;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_lines);
}

 final  List<ReceiptInfo> _receipts;
@override@JsonKey() List<ReceiptInfo> get receipts {
  if (_receipts is EqualUnmodifiableListView) return _receipts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_receipts);
}

 final  List<ApprovalEntry> _approvals;
@override@JsonKey() List<ApprovalEntry> get approvals {
  if (_approvals is EqualUnmodifiableListView) return _approvals;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_approvals);
}

@override final  ApprovalRuleInfo? approvalRule;
@override@JsonKey() final  int approvalCycle;
@override final  int? currentLevel;
 final  List<FlagInfo> _flags;
@override@JsonKey() List<FlagInfo> get flags {
  if (_flags is EqualUnmodifiableListView) return _flags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_flags);
}

@override@JsonKey() final  BudgetImpact budget;
 final  Set<String> _allowedActions;
@override@JsonKey() Set<String> get allowedActions {
  if (_allowedActions is EqualUnmodifiableSetView) return _allowedActions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_allowedActions);
}

@override final  String? rejectReason;
@override final  String? cancelReason;
@override final  String? submittedAt;
@override final  String? updatedAt;

/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExpenseDetailCopyWith<_ExpenseDetail> get copyWith => __$ExpenseDetailCopyWithImpl<_ExpenseDetail>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExpenseDetail&&(identical(other.id, id) || other.id == id)&&(identical(other.docNo, docNo) || other.docNo == docNo)&&(identical(other.clientUuid, clientUuid) || other.clientUuid == clientUuid)&&(identical(other.type, type) || other.type == type)&&(identical(other.typeLabel, typeLabel) || other.typeLabel == typeLabel)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.title, title) || other.title == title)&&(identical(other.grandTotal, grandTotal) || other.grandTotal == grandTotal)&&(identical(other.approvedAmount, approvedAmount) || other.approvedAmount == approvedAmount)&&(identical(other.requestDate, requestDate) || other.requestDate == requestDate)&&(identical(other.neededDate, neededDate) || other.neededDate == neededDate)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.project, project) || other.project == project)&&(identical(other.costCenter, costCenter) || other.costCenter == costCenter)&&const DeepCollectionEquality().equals(other.requesters, _requesters)&&(identical(other.createdByName, createdByName) || other.createdByName == createdByName)&&(identical(other.bankName, bankName) || other.bankName == bankName)&&(identical(other.bankAccountNo, bankAccountNo) || other.bankAccountNo == bankAccountNo)&&(identical(other.bankAccountHolder, bankAccountHolder) || other.bankAccountHolder == bankAccountHolder)&&const DeepCollectionEquality().equals(other.lines, _lines)&&const DeepCollectionEquality().equals(other.receipts, _receipts)&&const DeepCollectionEquality().equals(other.approvals, _approvals)&&(identical(other.approvalRule, approvalRule) || other.approvalRule == approvalRule)&&(identical(other.approvalCycle, approvalCycle) || other.approvalCycle == approvalCycle)&&(identical(other.currentLevel, currentLevel) || other.currentLevel == currentLevel)&&const DeepCollectionEquality().equals(other.flags, _flags)&&(identical(other.budget, budget) || other.budget == budget)&&const DeepCollectionEquality().equals(other.allowedActions, _allowedActions)&&(identical(other.rejectReason, rejectReason) || other.rejectReason == rejectReason)&&(identical(other.cancelReason, cancelReason) || other.cancelReason == cancelReason)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}


@override
int get hashCode {
    return Object.hashAll([runtimeType,id,docNo,clientUuid,type,typeLabel,status,statusLabel,title,grandTotal,approvedAmount,requestDate,neededDate,notes,project,costCenter,const DeepCollectionEquality().hash(_requesters),createdByName,bankName,bankAccountNo,bankAccountHolder,const DeepCollectionEquality().hash(_lines),const DeepCollectionEquality().hash(_receipts),const DeepCollectionEquality().hash(_approvals),approvalRule,approvalCycle,currentLevel,const DeepCollectionEquality().hash(_flags),budget,const DeepCollectionEquality().hash(_allowedActions),rejectReason,cancelReason,submittedAt,updatedAt]);
}

@override
String toString() {
    return 'ExpenseDetail(id: $id, docNo: $docNo, clientUuid: $clientUuid, type: $type, typeLabel: $typeLabel, status: $status, statusLabel: $statusLabel, title: $title, grandTotal: $grandTotal, approvedAmount: $approvedAmount, requestDate: $requestDate, neededDate: $neededDate, notes: $notes, project: $project, costCenter: $costCenter, requesters: $requesters, createdByName: $createdByName, bankName: $bankName, bankAccountNo: $bankAccountNo, bankAccountHolder: $bankAccountHolder, lines: $lines, receipts: $receipts, approvals: $approvals, approvalRule: $approvalRule, approvalCycle: $approvalCycle, currentLevel: $currentLevel, flags: $flags, budget: $budget, allowedActions: $allowedActions, rejectReason: $rejectReason, cancelReason: $cancelReason, submittedAt: $submittedAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$ExpenseDetailCopyWith<$Res> implements $ExpenseDetailCopyWith<$Res> {
  factory _$ExpenseDetailCopyWith(_ExpenseDetail value, $Res Function(_ExpenseDetail) _then) = __$ExpenseDetailCopyWithImpl;
@override @useResult
$Res call({
 int id, String? docNo, String? clientUuid, RequestType type, String typeLabel, RequestStatus status, String statusLabel, String title, int grandTotal, int? approvedAmount, String? requestDate, String? neededDate, String? notes, RefItem? project, RefItem? costCenter, List<RefItem> requesters, String? createdByName, String? bankName, String? bankAccountNo, String? bankAccountHolder, List<ExpenseLine> lines, List<ReceiptInfo> receipts, List<ApprovalEntry> approvals, ApprovalRuleInfo? approvalRule, int approvalCycle, int? currentLevel, List<FlagInfo> flags, BudgetImpact budget, Set<String> allowedActions, String? rejectReason, String? cancelReason, String? submittedAt, String? updatedAt
});


@override $RefItemCopyWith<$Res>? get project;@override $RefItemCopyWith<$Res>? get costCenter;@override $ApprovalRuleInfoCopyWith<$Res>? get approvalRule;@override $BudgetImpactCopyWith<$Res> get budget;

}
/// @nodoc
class __$ExpenseDetailCopyWithImpl<$Res>
    implements _$ExpenseDetailCopyWith<$Res> {
  __$ExpenseDetailCopyWithImpl(this._self, this._then);

  final _ExpenseDetail _self;
  final $Res Function(_ExpenseDetail) _then;

/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? docNo = freezed,Object? clientUuid = freezed,Object? type = null,Object? typeLabel = null,Object? status = null,Object? statusLabel = null,Object? title = null,Object? grandTotal = null,Object? approvedAmount = freezed,Object? requestDate = freezed,Object? neededDate = freezed,Object? notes = freezed,Object? project = freezed,Object? costCenter = freezed,Object? requesters = null,Object? createdByName = freezed,Object? bankName = freezed,Object? bankAccountNo = freezed,Object? bankAccountHolder = freezed,Object? lines = null,Object? receipts = null,Object? approvals = null,Object? approvalRule = freezed,Object? approvalCycle = null,Object? currentLevel = freezed,Object? flags = null,Object? budget = null,Object? allowedActions = null,Object? rejectReason = freezed,Object? cancelReason = freezed,Object? submittedAt = freezed,Object? updatedAt = freezed,}) {
  return _then(_ExpenseDetail(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,docNo: freezed == docNo ? _self.docNo : docNo // ignore: cast_nullable_to_non_nullable
as String?,clientUuid: freezed == clientUuid ? _self.clientUuid : clientUuid // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as RequestType,typeLabel: null == typeLabel ? _self.typeLabel : typeLabel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RequestStatus,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,grandTotal: null == grandTotal ? _self.grandTotal : grandTotal // ignore: cast_nullable_to_non_nullable
as int,approvedAmount: freezed == approvedAmount ? _self.approvedAmount : approvedAmount // ignore: cast_nullable_to_non_nullable
as int?,requestDate: freezed == requestDate ? _self.requestDate : requestDate // ignore: cast_nullable_to_non_nullable
as String?,neededDate: freezed == neededDate ? _self.neededDate : neededDate // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as RefItem?,costCenter: freezed == costCenter ? _self.costCenter : costCenter // ignore: cast_nullable_to_non_nullable
as RefItem?,requesters: null == requesters ? _self._requesters : requesters // ignore: cast_nullable_to_non_nullable
as List<RefItem>,createdByName: freezed == createdByName ? _self.createdByName : createdByName // ignore: cast_nullable_to_non_nullable
as String?,bankName: freezed == bankName ? _self.bankName : bankName // ignore: cast_nullable_to_non_nullable
as String?,bankAccountNo: freezed == bankAccountNo ? _self.bankAccountNo : bankAccountNo // ignore: cast_nullable_to_non_nullable
as String?,bankAccountHolder: freezed == bankAccountHolder ? _self.bankAccountHolder : bankAccountHolder // ignore: cast_nullable_to_non_nullable
as String?,lines: null == lines ? _self._lines : lines // ignore: cast_nullable_to_non_nullable
as List<ExpenseLine>,receipts: null == receipts ? _self._receipts : receipts // ignore: cast_nullable_to_non_nullable
as List<ReceiptInfo>,approvals: null == approvals ? _self._approvals : approvals // ignore: cast_nullable_to_non_nullable
as List<ApprovalEntry>,approvalRule: freezed == approvalRule ? _self.approvalRule : approvalRule // ignore: cast_nullable_to_non_nullable
as ApprovalRuleInfo?,approvalCycle: null == approvalCycle ? _self.approvalCycle : approvalCycle // ignore: cast_nullable_to_non_nullable
as int,currentLevel: freezed == currentLevel ? _self.currentLevel : currentLevel // ignore: cast_nullable_to_non_nullable
as int?,flags: null == flags ? _self._flags : flags // ignore: cast_nullable_to_non_nullable
as List<FlagInfo>,budget: null == budget ? _self.budget : budget // ignore: cast_nullable_to_non_nullable
as BudgetImpact,allowedActions: null == allowedActions ? _self._allowedActions : allowedActions // ignore: cast_nullable_to_non_nullable
as Set<String>,rejectReason: freezed == rejectReason ? _self.rejectReason : rejectReason // ignore: cast_nullable_to_non_nullable
as String?,cancelReason: freezed == cancelReason ? _self.cancelReason : cancelReason // ignore: cast_nullable_to_non_nullable
as String?,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get project {
    if (_self.project == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.project!, (value) {
    return _then(_self.copyWith(project: value));
  });
}/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RefItemCopyWith<$Res>? get costCenter {
    if (_self.costCenter == null) {
    return null;
  }

  return $RefItemCopyWith<$Res>(_self.costCenter!, (value) {
    return _then(_self.copyWith(costCenter: value));
  });
}/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ApprovalRuleInfoCopyWith<$Res>? get approvalRule {
    if (_self.approvalRule == null) {
    return null;
  }

  return $ApprovalRuleInfoCopyWith<$Res>(_self.approvalRule!, (value) {
    return _then(_self.copyWith(approvalRule: value));
  });
}/// Create a copy of ExpenseDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BudgetImpactCopyWith<$Res> get budget {
  
  return $BudgetImpactCopyWith<$Res>(_self.budget, (value) {
    return _then(_self.copyWith(budget: value));
  });
}
}

/// @nodoc
mixin _$InboxItem {

 int get id; String? get docNo; RequestType get type; String get typeLabel; RequestStatus get status; String get statusLabel; String get title; String get scope; String get requesters; int get grandTotal; String? get neededDate; String get step; int? get level; BudgetImpact get budget; bool get budgetOverWarn; int get warningFlags; int get infoFlags;
/// Create a copy of InboxItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InboxItemCopyWith<InboxItem> get copyWith => _$InboxItemCopyWithImpl<InboxItem>(this as InboxItem, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as InboxItem;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InboxItem&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.docNo, _this.docNo) || other.docNo == _this.docNo)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.typeLabel, _this.typeLabel) || other.typeLabel == _this.typeLabel)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.statusLabel, _this.statusLabel) || other.statusLabel == _this.statusLabel)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.scope, _this.scope) || other.scope == _this.scope)&&(identical(other.requesters, _this.requesters) || other.requesters == _this.requesters)&&(identical(other.grandTotal, _this.grandTotal) || other.grandTotal == _this.grandTotal)&&(identical(other.neededDate, _this.neededDate) || other.neededDate == _this.neededDate)&&(identical(other.step, _this.step) || other.step == _this.step)&&(identical(other.level, _this.level) || other.level == _this.level)&&(identical(other.budget, _this.budget) || other.budget == _this.budget)&&(identical(other.budgetOverWarn, _this.budgetOverWarn) || other.budgetOverWarn == _this.budgetOverWarn)&&(identical(other.warningFlags, _this.warningFlags) || other.warningFlags == _this.warningFlags)&&(identical(other.infoFlags, _this.infoFlags) || other.infoFlags == _this.infoFlags));
}


@override
int get hashCode {
  final _this = this as InboxItem;
  return Object.hash(runtimeType,_this.id,_this.docNo,_this.type,_this.typeLabel,_this.status,_this.statusLabel,_this.title,_this.scope,_this.requesters,_this.grandTotal,_this.neededDate,_this.step,_this.level,_this.budget,_this.budgetOverWarn,_this.warningFlags,_this.infoFlags);
}

@override
String toString() {
  final _this = this as InboxItem;
  return 'InboxItem(id: ${_this.id}, docNo: ${_this.docNo}, type: ${_this.type}, typeLabel: ${_this.typeLabel}, status: ${_this.status}, statusLabel: ${_this.statusLabel}, title: ${_this.title}, scope: ${_this.scope}, requesters: ${_this.requesters}, grandTotal: ${_this.grandTotal}, neededDate: ${_this.neededDate}, step: ${_this.step}, level: ${_this.level}, budget: ${_this.budget}, budgetOverWarn: ${_this.budgetOverWarn}, warningFlags: ${_this.warningFlags}, infoFlags: ${_this.infoFlags})';
}


}

/// @nodoc
abstract mixin class $InboxItemCopyWith<$Res>  {
  factory $InboxItemCopyWith(InboxItem value, $Res Function(InboxItem) _then) = _$InboxItemCopyWithImpl;
@useResult
$Res call({
 int id, String? docNo, RequestType type, String typeLabel, RequestStatus status, String statusLabel, String title, String scope, String requesters, int grandTotal, String? neededDate, String step, int? level, BudgetImpact budget, bool budgetOverWarn, int warningFlags, int infoFlags
});


$BudgetImpactCopyWith<$Res> get budget;

}
/// @nodoc
class _$InboxItemCopyWithImpl<$Res>
    implements $InboxItemCopyWith<$Res> {
  _$InboxItemCopyWithImpl(this._self, this._then);

  final InboxItem _self;
  final $Res Function(InboxItem) _then;

/// Create a copy of InboxItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? docNo = freezed,Object? type = null,Object? typeLabel = null,Object? status = null,Object? statusLabel = null,Object? title = null,Object? scope = null,Object? requesters = null,Object? grandTotal = null,Object? neededDate = freezed,Object? step = null,Object? level = freezed,Object? budget = null,Object? budgetOverWarn = null,Object? warningFlags = null,Object? infoFlags = null,}) {
  return _then(InboxItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,docNo: freezed == docNo ? _self.docNo : docNo // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as RequestType,typeLabel: null == typeLabel ? _self.typeLabel : typeLabel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RequestStatus,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,scope: null == scope ? _self.scope : scope // ignore: cast_nullable_to_non_nullable
as String,requesters: null == requesters ? _self.requesters : requesters // ignore: cast_nullable_to_non_nullable
as String,grandTotal: null == grandTotal ? _self.grandTotal : grandTotal // ignore: cast_nullable_to_non_nullable
as int,neededDate: freezed == neededDate ? _self.neededDate : neededDate // ignore: cast_nullable_to_non_nullable
as String?,step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as String,level: freezed == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int?,budget: null == budget ? _self.budget : budget // ignore: cast_nullable_to_non_nullable
as BudgetImpact,budgetOverWarn: null == budgetOverWarn ? _self.budgetOverWarn : budgetOverWarn // ignore: cast_nullable_to_non_nullable
as bool,warningFlags: null == warningFlags ? _self.warningFlags : warningFlags // ignore: cast_nullable_to_non_nullable
as int,infoFlags: null == infoFlags ? _self.infoFlags : infoFlags // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of InboxItem
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BudgetImpactCopyWith<$Res> get budget {
  
  return $BudgetImpactCopyWith<$Res>(_self.budget, (value) {
    return _then(_self.copyWith(budget: value));
  });
}
}


/// Adds pattern-matching-related methods to [InboxItem].
extension InboxItemPatterns on InboxItem {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InboxItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InboxItem() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InboxItem value)  $default,){
final _that = this;
switch (_that) {
case _InboxItem():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InboxItem value)?  $default,){
final _that = this;
switch (_that) {
case _InboxItem() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String? docNo,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  String scope,  String requesters,  int grandTotal,  String? neededDate,  String step,  int? level,  BudgetImpact budget,  bool budgetOverWarn,  int warningFlags,  int infoFlags)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InboxItem() when $default != null:
return $default(_that.id,_that.docNo,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.scope,_that.requesters,_that.grandTotal,_that.neededDate,_that.step,_that.level,_that.budget,_that.budgetOverWarn,_that.warningFlags,_that.infoFlags);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String? docNo,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  String scope,  String requesters,  int grandTotal,  String? neededDate,  String step,  int? level,  BudgetImpact budget,  bool budgetOverWarn,  int warningFlags,  int infoFlags)  $default,) {final _that = this;
switch (_that) {
case _InboxItem():
return $default(_that.id,_that.docNo,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.scope,_that.requesters,_that.grandTotal,_that.neededDate,_that.step,_that.level,_that.budget,_that.budgetOverWarn,_that.warningFlags,_that.infoFlags);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String? docNo,  RequestType type,  String typeLabel,  RequestStatus status,  String statusLabel,  String title,  String scope,  String requesters,  int grandTotal,  String? neededDate,  String step,  int? level,  BudgetImpact budget,  bool budgetOverWarn,  int warningFlags,  int infoFlags)?  $default,) {final _that = this;
switch (_that) {
case _InboxItem() when $default != null:
return $default(_that.id,_that.docNo,_that.type,_that.typeLabel,_that.status,_that.statusLabel,_that.title,_that.scope,_that.requesters,_that.grandTotal,_that.neededDate,_that.step,_that.level,_that.budget,_that.budgetOverWarn,_that.warningFlags,_that.infoFlags);case _:
  return null;

}
}

}

/// @nodoc


class _InboxItem implements InboxItem {
  const _InboxItem({required this.id, this.docNo, required this.type, required this.typeLabel, required this.status, required this.statusLabel, required this.title, required this.scope, required this.requesters, required this.grandTotal, this.neededDate, required this.step, this.level, required this.budget, this.budgetOverWarn = false, this.warningFlags = 0, this.infoFlags = 0});
  

@override final  int id;
@override final  String? docNo;
@override final  RequestType type;
@override final  String typeLabel;
@override final  RequestStatus status;
@override final  String statusLabel;
@override final  String title;
@override final  String scope;
@override final  String requesters;
@override final  int grandTotal;
@override final  String? neededDate;
@override final  String step;
@override final  int? level;
@override final  BudgetImpact budget;
@override@JsonKey() final  bool budgetOverWarn;
@override@JsonKey() final  int warningFlags;
@override@JsonKey() final  int infoFlags;

/// Create a copy of InboxItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InboxItemCopyWith<_InboxItem> get copyWith => __$InboxItemCopyWithImpl<_InboxItem>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _InboxItem&&(identical(other.id, id) || other.id == id)&&(identical(other.docNo, docNo) || other.docNo == docNo)&&(identical(other.type, type) || other.type == type)&&(identical(other.typeLabel, typeLabel) || other.typeLabel == typeLabel)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.title, title) || other.title == title)&&(identical(other.scope, scope) || other.scope == scope)&&(identical(other.requesters, requesters) || other.requesters == requesters)&&(identical(other.grandTotal, grandTotal) || other.grandTotal == grandTotal)&&(identical(other.neededDate, neededDate) || other.neededDate == neededDate)&&(identical(other.step, step) || other.step == step)&&(identical(other.level, level) || other.level == level)&&(identical(other.budget, budget) || other.budget == budget)&&(identical(other.budgetOverWarn, budgetOverWarn) || other.budgetOverWarn == budgetOverWarn)&&(identical(other.warningFlags, warningFlags) || other.warningFlags == warningFlags)&&(identical(other.infoFlags, infoFlags) || other.infoFlags == infoFlags));
}


@override
int get hashCode {
    return Object.hash(runtimeType,id,docNo,type,typeLabel,status,statusLabel,title,scope,requesters,grandTotal,neededDate,step,level,budget,budgetOverWarn,warningFlags,infoFlags);
}

@override
String toString() {
    return 'InboxItem(id: $id, docNo: $docNo, type: $type, typeLabel: $typeLabel, status: $status, statusLabel: $statusLabel, title: $title, scope: $scope, requesters: $requesters, grandTotal: $grandTotal, neededDate: $neededDate, step: $step, level: $level, budget: $budget, budgetOverWarn: $budgetOverWarn, warningFlags: $warningFlags, infoFlags: $infoFlags)';
}


}

/// @nodoc
abstract mixin class _$InboxItemCopyWith<$Res> implements $InboxItemCopyWith<$Res> {
  factory _$InboxItemCopyWith(_InboxItem value, $Res Function(_InboxItem) _then) = __$InboxItemCopyWithImpl;
@override @useResult
$Res call({
 int id, String? docNo, RequestType type, String typeLabel, RequestStatus status, String statusLabel, String title, String scope, String requesters, int grandTotal, String? neededDate, String step, int? level, BudgetImpact budget, bool budgetOverWarn, int warningFlags, int infoFlags
});


@override $BudgetImpactCopyWith<$Res> get budget;

}
/// @nodoc
class __$InboxItemCopyWithImpl<$Res>
    implements _$InboxItemCopyWith<$Res> {
  __$InboxItemCopyWithImpl(this._self, this._then);

  final _InboxItem _self;
  final $Res Function(_InboxItem) _then;

/// Create a copy of InboxItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? docNo = freezed,Object? type = null,Object? typeLabel = null,Object? status = null,Object? statusLabel = null,Object? title = null,Object? scope = null,Object? requesters = null,Object? grandTotal = null,Object? neededDate = freezed,Object? step = null,Object? level = freezed,Object? budget = null,Object? budgetOverWarn = null,Object? warningFlags = null,Object? infoFlags = null,}) {
  return _then(_InboxItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,docNo: freezed == docNo ? _self.docNo : docNo // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as RequestType,typeLabel: null == typeLabel ? _self.typeLabel : typeLabel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RequestStatus,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,scope: null == scope ? _self.scope : scope // ignore: cast_nullable_to_non_nullable
as String,requesters: null == requesters ? _self.requesters : requesters // ignore: cast_nullable_to_non_nullable
as String,grandTotal: null == grandTotal ? _self.grandTotal : grandTotal // ignore: cast_nullable_to_non_nullable
as int,neededDate: freezed == neededDate ? _self.neededDate : neededDate // ignore: cast_nullable_to_non_nullable
as String?,step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as String,level: freezed == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int?,budget: null == budget ? _self.budget : budget // ignore: cast_nullable_to_non_nullable
as BudgetImpact,budgetOverWarn: null == budgetOverWarn ? _self.budgetOverWarn : budgetOverWarn // ignore: cast_nullable_to_non_nullable
as bool,warningFlags: null == warningFlags ? _self.warningFlags : warningFlags // ignore: cast_nullable_to_non_nullable
as int,infoFlags: null == infoFlags ? _self.infoFlags : infoFlags // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of InboxItem
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BudgetImpactCopyWith<$Res> get budget {
  
  return $BudgetImpactCopyWith<$Res>(_self.budget, (value) {
    return _then(_self.copyWith(budget: value));
  });
}
}

// dart format on
