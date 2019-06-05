'use strict';

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import clone from 'clone';
import numeral from 'numeral';
import Ionicons from 'react-native-vector-icons/Ionicons';
import IconNames from './IconNames';

import Panel from './Panel';
import Button from './Button';

let imgColor = "#3B709F";

export default class extends Component {
    static propTypes = {
        discountPct: PropTypes.number,
        taxRate: PropTypes.number,
        menus: PropTypes.array,
        onMenuSelected: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            selectedItems: []
        };
    }

    minOrder(minOrder) {
        if (minOrder) {
            return minOrder;
        }

        return 1;
    }

    uncheckItem(item) {
        delete item['selected'];
        delete item['qty'];
        if (item.hasOwnProperty("subItems")) {
            for (let key in item.subItems) {
                delete item.subItems[key]['selected'];
            }
        }

        this.onMenuSelected();
    }

    renderCopyButton(item, idx, array) {
        if (item.hasOwnProperty("subItems") && Object.keys(item.subItems).length > 0) {
            return <Button onPress={this.copyItem.bind(this, item, idx, array)}>
                <Ionicons name={IconNames.copy} size={30} color={imgColor}/>
            </Button>;
        }
    }

    copyItem(item, idx, array) {
        let cloned = clone(item);
        this.uncheckItem(cloned);
        array.splice(idx + 1, 0, cloned);
    }

    subItemSelected(item, selected) {
        if (item.subItems[selected].selected) {
            item.subItems[selected].selected = false;
        } else {
            item.subItems[selected].selected = true;
            const grp = item.subItems[selected].group;
            if (grp) {
                for (let key in item.subItems) {
                    if (item.subItems[key].group === grp) {
                        item.subItems[key].selected = key === selected;
                    }
                }
            }
            if (!item.selected) {
                // item should selected
                item.selected = true;
                item.qty = item.qty ? item.qty : this.minOrder(item.minOrder);
            }
        }
        this.onMenuSelected();
    }

    increment(item) {
        item.selected = true;
        if (item.qty) {
            item.qty++;
        } else {
            item.qty = this.minOrder(item.minOrder);
        }

        this.onMenuSelected();
    }

    decrement(item) {
        if (item.selected) {
            if (--item.qty < this.minOrder(item.minOrder)) {
                this.uncheckItem(item);
            } else {
                this.onMenuSelected();
            }
        }
    }

    calcSubItems(item, addSubItemPrice) {
        if (item.hasOwnProperty("subItems")) {
            return Object.keys(item.subItems).reduce((prev, curr) => {
                if (item.subItems[curr].selected) {
                    let subItem = {name: item.subItems[curr].name};
                    if (item.subItems[curr].price) {
                        subItem.price = item.subItems[curr].price;
                        addSubItemPrice(subItem.price);
                    }
                    prev.push(subItem);
                }
                return prev;
            }, []);
        }

        return [];
    }

    onMenuSelected() {
        let subTotal = 0;
        let selectedItems = this.props.menus.reduce(
            (prev, curr) => {
                if (curr.selected) {
                    let itemPrice = Number(curr.price);
                    prev.push({
                        name: curr.name,
                        price: curr.price,
                        quantity: curr.qty,
                        subItems: this.calcSubItems(curr, (price) => itemPrice += Number(price))
                    });
                    subTotal += itemPrice * curr.qty;
                }
                return prev;
            }, []);

        this.setState({
            selectedItems: selectedItems,
            subTotal: subTotal
        }, () => {
            if (this.props.onMenuSelected) {
                const discounts = +(this.props.discountPct * subTotal).toFixed(2);
                const tax = +((subTotal + discounts) * this.props.taxRate).toFixed(2);
                this.props.onMenuSelected({
                    items: selectedItems,
                    subTotal: subTotal,
                    discount: discounts,
                    taxRate: this.props.taxRate,
                    tax: tax,
                    total: subTotal + discounts + tax
                });
            }
        });
    }

    render() {
        return (
            <View style={styles.marginLeft}>
                {this.props.menus.map((item, idx, array) => {
                    if (item.isOOO) {
                        return null;
                    }
                    let prev = idx >= 1 ? array[idx - 1] : null;
                    return <Panel key={`item-${idx}`}>
                        {/* this is header */}
                        <View style={[styles.row, prev && (prev.category != item.category) && styles.rowSeparatorTop]}>
                            <View style={styles.uncheckItem}>
                                {this.renderCopyButton(item, idx, array)}
                            </View>
                            <View style={styles.flex3}>
                                <Text style={[styles.defaultText, item.qty > 0 && styles.selected]}>
                                    {item.name}
                                </Text>
                                {item.descr &&
                                <Text style={[styles.defaultText, styles.descrText, item.qty > 0 && styles.selected]}>
                                    {item.descr}
                                </Text>}
                            </View>
                            <View style={styles.price}>
                                <Text style={[styles.defaultText, styles.alignRight, item.qty > 0 && styles.selected]}>
                                    {numeral(item.price).format('$0.00')}
                                </Text>
                            </View>
                            <View style={styles.flex2}>
                                <View style={[styles.row, styles.flexEnd]}>
                                    <Text style={[styles.defaultText, item.qty > 0 && styles.selected]}>
                                        {item.qty && item.qty > 0 ? item.qty : ""}
                                    </Text>
                                    <View style={styles.marginLeft}/>
                                    <Button onPress={this.decrement.bind(this, item)}>
                                        <Ionicons name={IconNames.removeCircle} size={40} color={imgColor}/>
                                    </Button>
                                    <View style={styles.marginLeft}/>
                                    <Button onPress={this.increment.bind(this, item)}>
                                        <Ionicons name={IconNames.addCircle} size={40} color={imgColor}/>
                                    </Button>
                                </View>
                            </View>
                        </View>
                        {/* this is body, realm return {'0': {subItem}} */}
                        {item.hasOwnProperty("subItems") && <View>{
                            Object.keys(item.subItems).map(subItem => {
                                if (item.subItems[subItem].isOOO) {
                                    return null;
                                }

                                return (
                                    <View key={`${idx}-${subItem}`} style={[styles.row]}>
                                        <View style={styles.uncheckItem}/>
                                        <View style={[styles.flex3, styles.marginLeft]}>
                                            <Text
                                                style={[styles.defaultText, styles.subItem, styles.marginLeft, item.subItems[subItem].selected && styles.selected]}>
                                                {item.subItems[subItem].name}
                                            </Text>
                                            {item.subItems[subItem].hasOwnProperty('descr') &&
                                            <Text
                                                style={[styles.defaultText, styles.subItem, styles.descrText, styles.marginLeft, item.subItems[subItem].selected && styles.selected]}>
                                                {item.subItems[subItem].descr}
                                            </Text>}
                                        </View>
                                        <View style={styles.price}>
                                            <Text
                                                style={[styles.defaultText, styles.alignRight, styles.subItem, item.subItems[subItem].selected && styles.selected]}>
                                                {item.subItems[subItem].price > 0 && numeral(item.subItems[subItem].price).format('$0.00')}
                                            </Text>
                                        </View>
                                        <View style={styles.flex2}>
                                            <View style={[styles.row, styles.flexEnd]}>
                                                <Switch value={item.subItems[subItem].selected ? true : false}
                                                        onValueChange={this.subItemSelected.bind(this, item, subItem)}/>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}</View>}
                    </Panel>;
                })}
                <View style={[styles.row, this.props.menus.length > 0 && styles.rowSeparatorTop, styles.marginBottom]}/>
                {this.props.children}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flexEnd: {
        justifyContent: 'flex-end',
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    flex3: {
        flex: 3,
    },
    flex4: {
        flex: 4,
    },
    price: {
        width: 100,
        paddingRight: 10,
    },
    defaultText: {
        marginRight: 2,
        marginLeft: 4,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5A5B5D',
    },
    descrText: {
        fontSize: 10,
        fontWeight: 'normal',
    },
    alignRight: {
        textAlign: 'right',
    },
    subItem: {
        fontWeight: 'normal',
    },
    paddingLeft20: {
        paddingLeft: 20,
    },
    selected: {
        color: '#984807',
    },
    disabled: {
        color: '#A9B1B9',
    },
    rowSeparatorBottom: {
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9",
    },
    rowSeparatorTop: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: "#A9B1B9",
    },
    marginLeft: {
        marginLeft: 4,
    },
    marginBottom: {
        marginBottom: 20,
    },
    uncheckItem: {
        width: 20,
    },
});
